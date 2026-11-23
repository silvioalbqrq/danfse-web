import test from "node:test";
import assert from "node:assert/strict";

import { nomePdf, nomeZip, formatarBytes } from "../js/nomes.js";
import { decodificarXml, LIMITE_XML, validarArquivo } from "../js/entrada.js";

const CHAVE = "35503082212345678000199000000000012345678901234567";

test("nomePdf usa a chave de acesso do Id NFS", () => {
  const xml = `<NFSe><infNFSe Id="NFS${CHAVE}"><xNome>Teste</xNome></infNFSe></NFSe>`;
  assert.equal(nomePdf(xml, "nota.xml"), `DANFSe-${CHAVE}.pdf`);
});

test("nomePdf aceita Id entre aspas simples e espaços", () => {
  const xml = `<infNFSe Id = 'NFS${CHAVE}'>`;
  assert.equal(nomePdf(xml, "nota.xml"), `DANFSe-${CHAVE}.pdf`);
});

test("nomePdf cai para o nome do arquivo sem Id", () => {
  assert.equal(nomePdf("<NFSe/>", "minha nota.xml"), "DANFSe-minha-nota.pdf");
});

test("nomePdf nunca devolve nome vazio", () => {
  assert.equal(nomePdf("<NFSe/>", ".xml"), "DANFSe-documento.pdf");
});

test("nomeZip usa data e hora locais", () => {
  const d = new Date(2026, 10, 23, 8, 5);
  assert.equal(nomeZip(d), "danfse-20261123-0805.zip");
});

test("formatarBytes usa unidades curtas em pt-BR", () => {
  assert.equal(formatarBytes(512), "512 B");
  assert.equal(formatarBytes(2048), "2,0 KB");
  assert.equal(formatarBytes(5 * 1024 * 1024), "5,0 MB");
});

test("decodificarXml lê UTF-8 com BOM", () => {
  const bytes = new Uint8Array([0xef, 0xbb, 0xbf, ...new TextEncoder().encode("<NFSe>ç</NFSe>")]);
  assert.equal(decodificarXml(bytes), "<NFSe>ç</NFSe>");
});

test("decodificarXml converte ISO-8859-1 e corrige a declaração", () => {
  const bytes = Uint8Array.from([
    ...new TextEncoder().encode('<?xml version="1.0" encoding="ISO-8859-1"?><NFSe>'),
    0xe7, // ç em latin1
    ...new TextEncoder().encode("</NFSe>"),
  ]);
  const saida = decodificarXml(bytes);
  assert.ok(saida.includes("<NFSe>ç</NFSe>"));
  assert.ok(saida.includes('encoding="UTF-8"'));
});

test("validarArquivo recusa extensão, vazio e tamanho", () => {
  assert.match(validarArquivo("nota.pdf", 10), /\.xml/);
  assert.match(validarArquivo("nota.xml", 0), /vazio/);
  assert.match(validarArquivo("nota.xml", LIMITE_XML + 1), /5 MiB/);
  assert.equal(validarArquivo("NOTA.XML", 10), null);
});
