// Nomes de arquivos e formatação de tamanho.

const CHAVE_NFS = /Id\s*=\s*["']NFS(\d{50})["']/;

function limpar(texto) {
  const limpo = String(texto)
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^A-Za-z0-9._-]+/g, "-")
    .replace(/-{2,}/g, "-")
    .replace(/^[-._]+|[-._]+$/g, "")
    .slice(0, 120);
  return limpo || "documento";
}

export function nomePdf(xml, nomeArquivo) {
  const achado = CHAVE_NFS.exec(String(xml || ""));
  if (achado) return `DANFSe-${achado[1]}.pdf`;
  const base = String(nomeArquivo || "")
    .replace(/^.*[\\/]/, "")
    .replace(/\.xml$/i, "");
  return `DANFSe-${limpar(base)}.pdf`;
}

export function nomeZip(data = new Date()) {
  const dois = (n) => String(n).padStart(2, "0");
  return `danfse-${data.getFullYear()}${dois(data.getMonth() + 1)}${dois(data.getDate())}-${dois(data.getHours())}${dois(data.getMinutes())}.zip`;
}

export function formatarBytes(n) {
  if (!Number.isFinite(n) || n < 0) return "—";
  if (n < 1024) return `${Math.round(n)} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1).replace(".", ",")} KB`;
  return `${(n / (1024 * 1024)).toFixed(1).replace(".", ",")} MB`;
}
