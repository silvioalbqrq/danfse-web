// Escritor ZIP mínimo (método store, sem compressão) para baixar o lote de PDFs
// sem depender de biblioteca externa.

const TABELA_CRC = (() => {
  const tabela = new Uint32Array(256);
  for (let n = 0; n < 256; n += 1) {
    let c = n;
    for (let k = 0; k < 8; k += 1) {
      c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    }
    tabela[n] = c >>> 0;
  }
  return tabela;
})();

export function crc32(bytes) {
  let c = 0xffffffff;
  for (let i = 0; i < bytes.length; i += 1) {
    c = TABELA_CRC[(c ^ bytes[i]) & 0xff] ^ (c >>> 8);
  }
  return (c ^ 0xffffffff) >>> 0;
}

export function desduplicarNomes(nomes) {
  const vistos = new Map();
  return nomes.map((nome) => {
    const total = (vistos.get(nome) || 0) + 1;
    vistos.set(nome, total);
    if (total === 1) return nome;
    const ponto = nome.lastIndexOf(".");
    const base = ponto > 0 ? nome.slice(0, ponto) : nome;
    const extensao = ponto > 0 ? nome.slice(ponto) : "";
    return `${base}-(${total})${extensao}`;
  });
}

function horaData(d) {
  const hora = ((d.getHours() & 0x1f) << 11) | ((d.getMinutes() & 0x3f) << 5) | (Math.floor(d.getSeconds() / 2) & 0x1f);
  const data = (((d.getFullYear() - 1980) & 0x7f) << 9) | (((d.getMonth() + 1) & 0x0f) << 5) | (d.getDate() & 0x1f);
  return { hora, data };
}

/**
 * Monta um ZIP com os arquivos informados, sem compressão.
 * @param {{nome: string, bytes: Uint8Array}[]} arquivos
 * @returns {Blob}
 */
export function criarZip(arquivos) {
  const codificador = new TextEncoder();
  const partes = [];
  const centrais = [];
  const { hora, data } = horaData(new Date());
  let deslocamento = 0;

  for (const arquivo of arquivos) {
    const nome = codificador.encode(arquivo.nome);
    const bytes = arquivo.bytes;
    const crc = crc32(bytes);

    const local = new Uint8Array(30 + nome.length);
    const lv = new DataView(local.buffer);
    lv.setUint32(0, 0x04034b50, true);
    lv.setUint16(4, 20, true); // versão necessária
    lv.setUint16(6, 0x0800, true); // nomes em UTF-8
    lv.setUint16(8, 0, true); // store
    lv.setUint16(10, hora, true);
    lv.setUint16(12, data, true);
    lv.setUint32(14, crc, true);
    lv.setUint32(18, bytes.length, true);
    lv.setUint32(22, bytes.length, true);
    lv.setUint16(26, nome.length, true);
    lv.setUint16(28, 0, true);
    local.set(nome, 30);
    partes.push(local, bytes);

    const central = new Uint8Array(46 + nome.length);
    const cv = new DataView(central.buffer);
    cv.setUint32(0, 0x02014b50, true);
    cv.setUint16(4, 20, true); // versão de criação
    cv.setUint16(6, 20, true); // versão necessária
    cv.setUint16(8, 0x0800, true);
    cv.setUint16(10, 0, true);
    cv.setUint16(12, hora, true);
    cv.setUint16(14, data, true);
    cv.setUint32(16, crc, true);
    cv.setUint32(20, bytes.length, true);
    cv.setUint32(24, bytes.length, true);
    cv.setUint16(28, nome.length, true);
    cv.setUint32(42, deslocamento, true);
    central.set(nome, 46);
    centrais.push(central);

    deslocamento += local.length + bytes.length;
  }

  const tamanhoCentrais = centrais.reduce((soma, c) => soma + c.length, 0);
  const fim = new Uint8Array(22);
  const fv = new DataView(fim.buffer);
  fv.setUint32(0, 0x06054b50, true);
  fv.setUint16(8, arquivos.length, true);
  fv.setUint16(10, arquivos.length, true);
  fv.setUint32(12, tamanhoCentrais, true);
  fv.setUint32(16, deslocamento, true);

  return new Blob([...partes, ...centrais, fim], { type: "application/zip" });
}
