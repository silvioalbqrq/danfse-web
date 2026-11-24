// Fala com o Worker que carrega o motor oficial. Nenhuma outra parte do site
// conhece WebAssembly.

let carregando = null;
let worker = null;
const pendentes = new Map();
let proximoId = 1;

function iniciarMotor() {
  return new Promise((resolver, rejeitar) => {
    if (typeof Worker !== "function") {
      rejeitar(new Error("Este navegador não suporta Web Worker. Use Chrome, Edge, Firefox ou Safari atualizados."));
      return;
    }

    worker = new Worker("js/worker.js");
    let pronto = false;
    let prazo;

    const falhar = (erro) => {
      clearTimeout(prazo);
      for (const { falha } of pendentes.values()) falha(erro);
      pendentes.clear();
      worker?.terminate();
      worker = null;
      if (!pronto) rejeitar(erro);
    };

    prazo = setTimeout(() => falhar(new Error("O motor demorou mais de 20s para iniciar.")), 20000);

    worker.onerror = (evento) => falhar(new Error(evento.message || "O motor falhou ao iniciar."));
    worker.onmessage = (evento) => {
      const dados = evento.data || {};

      if (dados.tipo === "pronto") {
        pronto = true;
        clearTimeout(prazo);
        resolver({
          gerarPdf(payload) {
            return new Promise((ok, falha) => {
              const id = proximoId++;
              pendentes.set(id, { ok, falha });
              worker.postMessage({ tipo: "gerar", id, payload });
            });
          },
        });
        return;
      }

      if (dados.tipo === "erro") {
        falhar(new Error(dados.erro));
        return;
      }

      const pendente = pendentes.get(dados.id);
      if (!pendente) return;
      pendentes.delete(dados.id);
      if (dados.erro) pendente.falha(new Error(dados.erro));
      else pendente.ok(dados.pdf);
    };
  });
}

export function carregarMotor() {
  if (!carregando) carregando = iniciarMotor();
  return carregando;
}
