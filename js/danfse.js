// Ponte entre a interface e o gerador oficial em WebAssembly.

import { carregarMotor } from "./wasm.js";

function base64ParaBytes(base64) {
  const binario = atob(base64);
  const bytes = new Uint8Array(binario.length);
  for (let i = 0; i < binario.length; i += 1) {
    bytes[i] = binario.charCodeAt(i);
  }
  return bytes;
}

/**
 * @param {string} xml
 * @param {{stc: number, canhoto: boolean}} opcoes
 * @returns {Promise<Blob>}
 */
export async function gerarPdf(xml, opcoes) {
  const api = await carregarMotor();

  if (!api || typeof api.gerarPdf !== "function") {
    throw new Error("O motor WASM não expôs gerarPdf.");
  }

  const resposta = api.gerarPdf(JSON.stringify({
    xml,
    stc: Number(opcoes.stc) || 0,
    canhoto: Boolean(opcoes.canhoto),
  }));

  const resultado = typeof resposta === "string" ? JSON.parse(resposta) : resposta;
  if (!resultado || resultado.error) {
    throw new Error(resultado?.error || "O gerador devolveu uma resposta vazia.");
  }
  if (!resultado.pdf) {
    throw new Error("O gerador não devolveu o conteúdo do PDF.");
  }

  return new Blob([base64ParaBytes(resultado.pdf)], { type: "application/pdf" });
}
