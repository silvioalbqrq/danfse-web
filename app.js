import { carregarMotor } from "./js/wasm.js";
import { gerarPdf } from "./js/danfse.js";
import { criarZip, desduplicarNomes } from "./js/zip.js";
import { decodificarXml, validarArquivo, chaveAcesso } from "./js/entrada.js";
import { nomePdf, nomeZip, formatarBytes } from "./js/nomes.js";
import { $, toast, baixarBlob, definirStatusMotor } from "./js/ui.js";

const MAX_ARQUIVOS = 100;

const estado = {
  motor: "carregando", // carregando | pronto | falhou
  itens: [],
  opcoes: { stc: 0, canhoto: true },
  processando: false,
  cancelar: false,
  progresso: null,
  proximoId: 1,
};

const drop = $("drop");
const entrada = $("entradaArquivos");
const lista = $("lista");

/* ---------- entrada de arquivos ---------- */

function abrirSeletor() {
  if (estado.motor !== "pronto") {
    toast("Aguarde o motor carregar antes de escolher arquivos.", "erro");
    return;
  }
  entrada.click();
}

async function adicionarArquivos(arquivos) {
  let recusados = 0;
  let ignorados = 0;
  let duplicados = 0;

  for (const arquivo of arquivos) {
    const aceitos = estado.itens.filter((item) => item.status !== "recusado").length;
    if (aceitos >= MAX_ARQUIVOS) {
      toast(`Limite de ${MAX_ARQUIVOS} arquivos por lote.`, "erro");
      break;
    }

    const motivo = validarArquivo(arquivo.name, arquivo.size);
    if (motivo) {
      estado.itens.push({
        id: estado.proximoId++,
        nome: arquivo.name,
        tamanho: arquivo.size,
        arquivo: null,
        status: "recusado",
        erro: motivo,
      });
      recusados += 1;
      continue;
    }

    const repetido = estado.itens.some(
      (item) => item.nome === arquivo.name && item.tamanho === arquivo.size,
    );
    if (repetido) {
      ignorados += 1;
      continue;
    }

    let chave = null;
    try {
      const bytes = new Uint8Array(await arquivo.arrayBuffer());
      chave = chaveAcesso(decodificarXml(bytes));
    } catch {
      // segue sem chave; a geração mostra o erro de leitura
    }
    const existente = chave && estado.itens.find((item) => item.chave === chave);
    if (existente) {
      estado.itens.push({
        id: estado.proximoId++,
        nome: arquivo.name,
        tamanho: arquivo.size,
        arquivo: null,
        status: "recusado",
        erro: `Nota repetida: mesma chave de acesso de "${existente.nome}".`,
        detalhe: `Chave de acesso: ${chave}`,
      });
      duplicados += 1;
      continue;
    }

    estado.itens.push({
      id: estado.proximoId++,
      nome: arquivo.name,
      tamanho: arquivo.size,
      arquivo,
      chave,
      status: "pendente",
      erro: null,
      detalhe: null,
      pdf: null,
      nomePdf: null,
      tamanhoPdf: 0,
    });
  }

  render();
  if (recusados) toast(`${recusados} arquivo(s) recusado(s). Veja o motivo na lista.`, "erro");
  if (ignorados) toast(`${ignorados} duplicado(s) ignorado(s).`);
  if (duplicados) toast(`${duplicados} nota(s) repetida(s) ignorada(s): mesma chave de acesso.`, "erro");
}

/* ---------- geração ---------- */

function traduzirErro(erro) {
  const mensagem = String(erro?.message || erro || "");
  if (/maximum size|exceeds maximum|5242880/i.test(mensagem)) return "XML acima do limite de 5 MiB.";
  if (/invalid stc/i.test(mensagem)) return "Situação da nota inválida.";
  if (/xml|expected element|unexpected|syntax|charset|encoding/i.test(mensagem)) {
    return "O XML não está no padrão de NFS-e.";
  }
  if (/pdf/i.test(mensagem)) return "O gerador não conseguiu montar o PDF deste XML.";
  return "Não foi possível gerar este DANFSe.";
}

function liberar(item) {
  item.pdf = null;
}

async function gerarLote(itens) {
  if (estado.processando || estado.motor !== "pronto") return;

  const fila = itens || estado.itens.filter((item) => item.status === "pendente" || item.status === "erro");
  if (!fila.length) {
    toast("Nenhum arquivo pendente para gerar.");
    return;
  }

  estado.processando = true;
  estado.cancelar = false;
  estado.progresso = { atual: 0, total: fila.length, nome: "" };
  render();

  try {
    for (let indice = 0; indice < fila.length; indice += 1) {
      if (estado.cancelar) break;
      const item = fila[indice];
      estado.progresso = { atual: indice + 1, total: fila.length, nome: item.nome };
      item.status = "gerando";
      item.erro = null;
      item.detalhe = null;
      render();

      try {
        const bytes = new Uint8Array(await item.arquivo.arrayBuffer());
        const xml = decodificarXml(bytes);
        const pdf = await gerarPdf(xml, estado.opcoes);

        liberar(item);
        item.pdf = pdf;
        item.tamanhoPdf = pdf.size;
        item.nomePdf = nomePdf(item.nome);
        item.status = "pronto";
      } catch (erro) {
        item.status = "erro";
        item.erro = traduzirErro(erro);
        item.detalhe = erro?.message || String(erro);
        console.error(`Falha ao gerar ${item.nome}:`, erro);
      }

      render();
      await new Promise((resolver) => setTimeout(resolver, 0));
    }
  } finally {
    const cancelado = estado.cancelar;
    estado.processando = false;
    estado.cancelar = false;
    estado.progresso = null;
    render();

    if (cancelado) {
      toast("Lote interrompido. Os PDFs já gerados continuam disponíveis.");
    } else {
      const prontos = estado.itens.filter((item) => item.status === "pronto").length;
      const erros = estado.itens.filter((item) => item.status === "erro").length;
      if (prontos) toast(`${prontos} PDF(s) pronto(s)${erros ? ` · ${erros} com erro` : ""}.`, "ok");
    }
  }
}

/* ---------- ZIP ---------- */

async function baixarZip() {
  const prontos = estado.itens.filter((item) => item.status === "pronto" && item.pdf);
  if (!prontos.length) return;

  const botao = $("btnZip");
  botao.disabled = true;
  botao.textContent = "Montando ZIP…";

  try {
    const nomes = desduplicarNomes(prontos.map((item) => item.nomePdf));
    const arquivos = [];
    for (let i = 0; i < prontos.length; i += 1) {
      const bytes = new Uint8Array(await prontos[i].pdf.arrayBuffer());
      arquivos.push({ nome: nomes[i], bytes });
    }
    baixarBlob(criarZip(arquivos), nomeZip());
    toast(`${arquivos.length} PDF(s) no ZIP.`, "ok");
  } catch (erro) {
    console.error(erro);
    toast("Não foi possível montar o ZIP. Baixe os PDFs um a um.", "erro");
  } finally {
    render();
  }
}

/* ---------- lista ---------- */

function rotuloStatus(status) {
  return {
    pendente: "Pendente",
    gerando: "Gerando",
    pronto: "Pronto",
    erro: "Erro",
    recusado: "Recusado",
  }[status] || status;
}

function botaoAcao(texto, acao, extra = "") {
  const botao = document.createElement("button");
  botao.type = "button";
  botao.className = `btn pequeno ${extra}`.trim();
  botao.dataset.acao = acao;
  botao.textContent = texto;
  return botao;
}

function linha(item) {
  const li = document.createElement("li");
  li.className = "arquivo";
  li.dataset.id = String(item.id);

  const info = document.createElement("div");
  const nome = document.createElement("span");
  nome.className = "arquivo-nome";
  nome.textContent = item.nome;
  const meta = document.createElement("span");
  meta.className = "arquivo-meta";
  meta.textContent = item.nomePdf
    ? `${formatarBytes(item.tamanho)} → ${item.nomePdf} · ${formatarBytes(item.tamanhoPdf)}`
    : formatarBytes(item.tamanho);
  info.append(nome, meta);

  const lado = document.createElement("div");
  lado.className = "arquivo-lado";
  const tag = document.createElement("span");
  tag.className = `tag ${item.status}`;
  tag.textContent = rotuloStatus(item.status);
  lado.append(tag);

  li.append(info, lado);

  const acoes = document.createElement("div");
  acoes.className = "arquivo-acoes";

  if (item.status === "pronto") {
    acoes.append(
      botaoAcao("Baixar", "baixar"),
      botaoAcao("Remover", "remover", "ghost"),
    );
  } else if (item.status === "gerando") {
    // sem ações enquanto gera
  } else {
    if (item.status === "erro") acoes.append(botaoAcao("Tentar novamente", "gerar"));
    acoes.append(botaoAcao("Remover", "remover", "ghost"));
  }
  li.append(acoes);

  if (item.erro) {
    const erro = document.createElement("p");
    erro.className = "arquivo-erro";
    erro.append(document.createTextNode(item.erro));
    if (item.detalhe) {
      const detalhes = document.createElement("details");
      const resumo = document.createElement("summary");
      resumo.textContent = "Detalhe técnico";
      const codigo = document.createElement("code");
      codigo.textContent = item.detalhe;
      detalhes.append(resumo, codigo);
      erro.append(detalhes);
    }
    li.append(erro);
  }

  return li;
}

function render() {
  const ativo = document.activeElement;
  const linhaAtiva = ativo?.closest?.(".arquivo");
  const foco = linhaAtiva && ativo.dataset.acao
    ? { id: linhaAtiva.dataset.id, acao: ativo.dataset.acao }
    : null;

  const itens = estado.itens;
  const prontos = itens.filter((item) => item.status === "pronto");
  const erros = itens.filter((item) => item.status === "erro");
  const recusados = itens.filter((item) => item.status === "recusado");
  const pendentes = itens.filter((item) => item.status === "pendente" || item.status === "erro");

  $("listaTopo").hidden = itens.length === 0;
  $("listaVazia").hidden = itens.length > 0;
  $("resumoLista").textContent = `${itens.length} arquivo${itens.length === 1 ? "" : "s"}`;
  lista.replaceChildren(...itens.map(linha));
  if (foco) {
    lista.querySelector(`.arquivo[data-id="${foco.id}"] button[data-acao="${foco.acao}"]`)?.focus();
  }

  $("btnGerar").disabled = estado.motor !== "pronto" || estado.processando || pendentes.length === 0;
  $("btnGerar").textContent = estado.processando ? "Gerando…" : "Gerar DANFSe(s)";
  $("btnCancelar").hidden = !estado.processando;
  $("btnLimpar").disabled = estado.processando;
  $("situacao").disabled = estado.processando;
  $("canhoto").disabled = estado.processando;

  $("resumo").hidden = itens.length === 0;
  $("resumoProntos").textContent = String(prontos.length);
  $("resumoErros").textContent = String(erros.length);
  $("resumoRecusados").textContent = String(recusados.length);
  $("btnZip").disabled = estado.processando || prontos.length === 0;
  $("btnZip").textContent = prontos.length ? `Baixar ZIP (${prontos.length})` : "Baixar ZIP";

  const caixa = $("progressoBox");
  if (estado.processando && estado.progresso) {
    caixa.hidden = false;
    $("progresso").max = estado.progresso.total;
    $("progresso").value = estado.progresso.atual;
    $("progressoTexto").textContent = estado.progresso.nome
      ? `Gerando · ${estado.progresso.nome}`
      : "Preparando…";
    $("progressoNumero").textContent = `${estado.progresso.atual} de ${estado.progresso.total}`;
  } else {
    caixa.hidden = true;
  }

  drop.classList.toggle("indisponivel", estado.motor !== "pronto");
}

/* ---------- ações ---------- */

function remover(id) {
  const indice = estado.itens.findIndex((item) => item.id === Number(id));
  if (indice < 0) return;
  liberar(estado.itens[indice]);
  estado.itens.splice(indice, 1);
  render();
}

function limparTudo() {
  if (estado.processando) return;
  estado.itens.forEach(liberar);
  estado.itens = [];
  render();
}

function opcoesMudaram() {
  estado.opcoes = {
    stc: Number($("situacao").value),
    canhoto: $("canhoto").checked,
  };

  let invalidados = 0;
  for (const item of estado.itens) {
    if (item.status === "pronto") {
      liberar(item);
      item.status = "pendente";
      item.nomePdf = null;
      item.tamanhoPdf = 0;
      invalidados += 1;
    }
  }
  if (invalidados) {
    toast(`${invalidados} PDF(s) marcados para gerar de novo com as novas opções.`);
  }
  render();
}

/* ---------- eventos ---------- */

drop.addEventListener("click", (evento) => {
  if (evento.target.closest("button, input")) return;
  abrirSeletor();
});
drop.addEventListener("keydown", (evento) => {
  if (evento.key === "Enter" || evento.key === " ") {
    evento.preventDefault();
    abrirSeletor();
  }
});
$("btnEscolher").addEventListener("click", (evento) => {
  evento.stopPropagation();
  abrirSeletor();
});
entrada.addEventListener("change", () => {
  adicionarArquivos([...entrada.files]);
  entrada.value = "";
});

for (const tipo of ["dragenter", "dragover"]) {
  drop.addEventListener(tipo, (evento) => {
    evento.preventDefault();
    if (estado.motor === "pronto") drop.classList.add("arrastando");
  });
}
for (const tipo of ["dragleave", "dragend"]) {
  drop.addEventListener(tipo, () => drop.classList.remove("arrastando"));
}
drop.addEventListener("drop", (evento) => {
  evento.preventDefault();
  drop.classList.remove("arrastando");
  if (estado.motor !== "pronto") {
    toast("Aguarde o motor carregar.", "erro");
    return;
  }
  adicionarArquivos([...evento.dataTransfer.files]);
});
window.addEventListener("dragover", (evento) => evento.preventDefault());
window.addEventListener("drop", (evento) => evento.preventDefault());

lista.addEventListener("click", (evento) => {
  const botao = evento.target.closest("button[data-acao]");
  if (!botao) return;
  const id = botao.closest(".arquivo")?.dataset.id;
  const item = estado.itens.find((candidato) => candidato.id === Number(id));
  if (!item) return;

  if (botao.dataset.acao === "baixar") {
    if (item.pdf) baixarBlob(item.pdf, item.nomePdf);
  } else if (botao.dataset.acao === "remover") {
    remover(id);
  } else if (botao.dataset.acao === "gerar") {
    gerarLote([item]);
  }
});

$("btnGerar").addEventListener("click", () => gerarLote());
$("btnCancelar").addEventListener("click", () => {
  if (!estado.processando) return;
  estado.cancelar = true;
  toast("Cancelando depois do arquivo atual…");
});
$("btnZip").addEventListener("click", baixarZip);
$("btnLimpar").addEventListener("click", limparTudo);
$("situacao").addEventListener("change", opcoesMudaram);
$("canhoto").addEventListener("change", opcoesMudaram);

/* ---------- inicialização ---------- */

async function iniciar() {
  if (location.protocol === "file:") {
    estado.motor = "falhou";
    definirStatusMotor("abra pelo servidor local", "erro");
    $("avisoProtocolo").hidden = false;
    render();
    return;
  }

  definirStatusMotor("carregando motor…");
  try {
    await carregarMotor();
    estado.motor = "pronto";
    definirStatusMotor("motor pronto", "ok");
  } catch (erro) {
    estado.motor = "falhou";
    definirStatusMotor("motor indisponível", "erro");
    const aviso = $("erroMotor");
    aviso.hidden = false;
    aviso.replaceChildren();

    const titulo = document.createElement("strong");
    titulo.textContent = "O motor WASM não carregou.";
    const motivos = document.createElement("ul");
    const local = ["127.0.0.1", "localhost", "::1"].includes(location.hostname);
    for (const dica of [
      "Recarregue a página. Se persistir, tente outro navegador atualizado.",
      ...(local ? ["Confirme que wasm/danfse.wasm existe (scripts/build-wasm.ps1)."] : []),
      `Detalhe: ${erro?.message || erro}`,
    ]) {
      const li = document.createElement("li");
      li.textContent = dica;
      motivos.append(li);
    }
    aviso.append(titulo, motivos);
    console.error(erro);
  }
  render();
}

iniciar();
