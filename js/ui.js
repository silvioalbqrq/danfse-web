// Pequenos utilitários de DOM: seleção, avisos e download.

export const $ = (id) => document.getElementById(id);

export function toast(mensagem, tipo = "") {
  const area = $("toasts");
  if (!area) return;
  const caixa = document.createElement("p");
  caixa.className = `toast ${tipo}`.trim();
  caixa.setAttribute("role", tipo === "erro" ? "alert" : "status");
  caixa.textContent = mensagem;
  area.append(caixa);
  setTimeout(() => caixa.remove(), 5200);
}

export function baixarBlob(blob, nome) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = nome;
  link.rel = "noopener";
  document.body.append(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
}

export function definirStatusMotor(texto, estado = "") {
  const rotulo = $("estadoMotor");
  const ponto = $("ponto");
  if (rotulo) rotulo.textContent = texto;
  if (ponto) {
    ponto.classList.toggle("ok", estado === "ok");
    ponto.classList.toggle("erro", estado === "erro");
  }
}
