import test from "node:test";
import assert from "node:assert/strict";

import { crc32, criarZip, desduplicarNomes } from "../js/zip.js";

const texto = (s) => new TextEncoder().encode(s);

test("crc32 confere com o vetor padrão", () => {
  assert.equal(crc32(texto("123456789")), 0xcbf43926);
  assert.equal(crc32(new Uint8Array(0)), 0);
});

test("criarZip monta arquivo store válido", async () => {
  const blob = criarZip([
    { nome: "a.txt", bytes: texto("alfa") },
    { nome: "b.txt", bytes: texto("beta") },
  ]);
  const buf = new Uint8Array(await blob.arrayBuffer());
  const assinaturaLocal = [0x50, 0x4b, 0x03, 0x04];
  const assinaturaFim = [0x50, 0x4b, 0x05, 0x06];

  assert.deepEqual([...buf.slice(0, 4)], assinaturaLocal);
  assert.deepEqual([...buf.slice(-22, -18)], assinaturaFim);
  assert.ok(blob.type.includes("zip"));

  const cru = new TextDecoder("latin1").decode(buf);
  assert.ok(cru.includes("a.txt"));
  assert.ok(cru.includes("b.txt"));
  assert.ok(cru.includes("alfa"));
  assert.ok(cru.includes("beta"));
});

test("criarZip registra CRC e tamanho corretos no cabeçalho local", async () => {
  const bytes = texto("123456789");
  const blob = criarZip([{ nome: "x.txt", bytes }]);
  const dv = new DataView(await blob.arrayBuffer());
  assert.equal(dv.getUint32(14, true), 0xcbf43926); // crc no cabeçalho local
  assert.equal(dv.getUint32(18, true), bytes.length); // comprimido
  assert.equal(dv.getUint32(22, true), bytes.length); // original
});

test("desduplicarNomes acrescenta sufixo antes da extensão", () => {
  assert.deepEqual(
    desduplicarNomes(["DANFSe-1.pdf", "DANFSe-2.pdf", "DANFSe-1.pdf", "DANFSe-1.pdf"]),
    ["DANFSe-1.pdf", "DANFSe-2.pdf", "DANFSe-1-(2).pdf", "DANFSe-1-(3).pdf"],
  );
});
