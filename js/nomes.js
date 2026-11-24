// Nomes de arquivos e formatação de tamanho.

export function nomePdf(nomeArquivo) {
  const base = String(nomeArquivo || "")
    .replace(/^.*[\\/]/, "")
    .replace(/\.xml$/i, "");
  return `${base || "documento"}.pdf`;
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
