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

  const pdf = await api.gerarPdf({
    xml,
    stc: Number(opcoes.stc) || 0,
    canhoto: Boolean(opcoes.canhoto),
  });

  return new Blob([base64ParaBytes(pdf)], { type: "application/pdf" });
}
