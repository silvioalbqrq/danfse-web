// Roda o motor oficial fora da linha de execução da interface, para a página
// continuar respondendo enquanto um PDF é gerado.

importScripts("../wasm/wasm_exec.js");

let api = null;

function mensagemDe(erro) {
  return String(erro?.message || erro || "erro desconhecido");
}

async function iniciar() {
  if (typeof WebAssembly !== "object") {
    throw new Error("Este navegador não suporta WebAssembly. Use Chrome, Edge, Firefox ou Safari atualizados.");
  }

  const go = new globalThis.Go();
  let instancia;
  try {
    ({ instance: instancia } = await WebAssembly.instantiateStreaming(
      fetch("../wasm/danfse.wasm"),
      go.importObject,
    ));
  } catch {
    // Servidor sem o MIME application/wasm: baixa e compila em memória.
    const resposta = await fetch("../wasm/danfse.wasm");
    if (!resposta.ok) throw new Error(`Não encontrei wasm/danfse.wasm (HTTP ${resposta.status}).`);
    ({ instance: instancia } = await WebAssembly.instantiate(
      await resposta.arrayBuffer(),
      go.importObject,
    ));
  }

  go.run(instancia).catch((erro) => self.postMessage({ tipo: "erro", erro: mensagemDe(erro) }));

  const limite = Date.now() + 20000;
  while (!(globalThis.danfseWasm?.ready || globalThis.danfseWasm?.error)) {
    if (Date.now() > limite) throw new Error("O motor demorou mais de 20s para iniciar.");
    await new Promise((resolver) => setTimeout(resolver, 50));
  }
  if (globalThis.danfseWasm.error) {
    throw new Error(`O motor falhou ao iniciar: ${globalThis.danfseWasm.error}`);
  }

  api = globalThis.danfseWasm;
  self.postMessage({ tipo: "pronto" });
}

self.onmessage = async (evento) => {
  const dados = evento.data || {};
  if (dados.tipo !== "gerar" || !api) return;

  try {
    const resposta = api.gerarPdf(JSON.stringify(dados.payload));
    const resultado = typeof resposta === "string" ? JSON.parse(resposta) : resposta;
    if (!resultado || resultado.error) {
      throw new Error(resultado?.error || "O gerador devolveu uma resposta vazia.");
    }
    if (!resultado.pdf) {
      throw new Error("O gerador não devolveu o conteúdo do PDF.");
    }
    self.postMessage({ id: dados.id, pdf: resultado.pdf });
  } catch (erro) {
    self.postMessage({ id: dados.id, erro: mensagemDe(erro) });
  }
};

iniciar().catch((erro) => self.postMessage({ tipo: "erro", erro: mensagemDe(erro) }));
