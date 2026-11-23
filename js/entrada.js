// Leitura e validação dos XMLs que entram no lote.

import { formatarBytes } from "./nomes.js";

export const LIMITE_XML = 5 * 1024 * 1024; // mesmo limite do gerador oficial

const CODIFICACOES_LATINAS = new Set(["iso88591", "latin1", "windows1252", "cp1252", "latin9", "iso885915"]);

export function validarArquivo(nome, tamanho) {
  if (!/\.xml$/i.test(String(nome || ""))) return "Selecione um arquivo .xml.";
  if (!tamanho) return "O arquivo está vazio.";
  if (tamanho > LIMITE_XML) {
    return `O arquivo tem ${formatarBytes(tamanho)} e passa do limite de 5 MiB.`;
  }
  return null;
}

function normalizarDeclaracao(texto) {
  return texto.replace(
    /(<\?xml[^>]*?)encoding\s*=\s*["'][^"']+["']/i,
    (original, inicio) => `${inicio}encoding="UTF-8"`,
  );
}

function decodificar(bytes, codificacao) {
  try {
    return new TextDecoder(codificacao, { fatal: false }).decode(bytes);
  } catch {
    return new TextDecoder("utf-8", { fatal: false }).decode(bytes);
  }
}

/**
 * Converte os bytes do XML em texto UTF-8, respeitando BOM e declaração de
 * codificação. O gerador Go não registra CharsetReader, então a declaração
 * precisa acompanhar o texto devolvido.
 * @param {Uint8Array} entrada
 * @returns {string}
 */
export function decodificarXml(entrada) {
  const bytes = entrada instanceof Uint8Array ? entrada : new Uint8Array(entrada);

  if (bytes[0] === 0xef && bytes[1] === 0xbb && bytes[2] === 0xbf) {
    return normalizarDeclaracao(decodificar(bytes.subarray(3), "utf-8"));
  }
  if (bytes[0] === 0xff && bytes[1] === 0xfe) {
    return normalizarDeclaracao(decodificar(bytes.subarray(2), "utf-16le"));
  }
  if (bytes[0] === 0xfe && bytes[1] === 0xff) {
    return normalizarDeclaracao(decodificar(bytes.subarray(2), "utf-16be"));
  }

  const cabecalho = decodificar(bytes.subarray(0, 256), "latin1");
  const achado = /encoding\s*=\s*["']([^"']+)["']/i.exec(cabecalho);
  const codificacao = achado ? achado[1].toLowerCase().replace(/[^a-z0-9]/g, "") : "utf8";

  if (CODIFICACOES_LATINAS.has(codificacao)) {
    return normalizarDeclaracao(decodificar(bytes, "windows-1252"));
  }
  return normalizarDeclaracao(decodificar(bytes, "utf-8"));
}
