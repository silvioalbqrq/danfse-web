// Carrega o runtime do Go e o binário do gerador. Nenhuma outra parte do site
// conhece WebAssembly.

let carregando = null;

function carregarScript(src) {
  return new Promise((resolver, rejeitar) => {
    const script = document.createElement("script");
    script.src = src;
    script.onload = () => resolver();
    script.onerror = () => rejeitar(new Error(`Não consegui carregar ${src}.`));
    document.head.append(script);
  });
}

function esperar(condicao, limiteMs, mensagem) {
  const inicio = Date.now();
  return new Promise((resolver, rejeitar) => {
    const passo = () => {
      if (condicao()) return resolver();
      if (Date.now() - inicio > limiteMs) return rejeitar(new Error(mensagem));
      setTimeout(passo, 50);
    };
    passo();
  });
}

async function iniciarMotor() {
  if (typeof WebAssembly !== "object") {
    throw new Error("Este navegador não suporta WebAssembly. Use Chrome, Edge, Firefox ou Safari atualizados.");
  }

  if (typeof globalThis.Go !== "function") {
    await carregarScript("wasm/wasm_exec.js");
  }
  if (typeof globalThis.Go !== "function") {
    throw new Error("wasm/wasm_exec.js não definiu o runtime Go.");
  }

  const resposta = await fetch("wasm/danfse.wasm");
  if (!resposta.ok) {
    throw new Error(`Não encontrei wasm/danfse.wasm (HTTP ${resposta.status}).`);
  }

  const go = new globalThis.Go();
  const { instance } = await WebAssembly.instantiate(await resposta.arrayBuffer(), go.importObject);
  go.run(instance);

  await esperar(
    () => globalThis.danfseWasm && typeof globalThis.danfseWasm === "object",
    20000,
    "O motor demorou mais de 20s para iniciar.",
  );
  await esperar(
    () => globalThis.danfseWasm.ready === true || globalThis.danfseWasm.error,
    20000,
    "O motor não terminou de iniciar.",
  );

  if (globalThis.danfseWasm.error) {
    throw new Error(`O motor falhou ao iniciar: ${globalThis.danfseWasm.error}`);
  }
  return globalThis.danfseWasm;
}

export function carregarMotor() {
  if (!carregando) carregando = iniciarMotor();
  return carregando;
}
