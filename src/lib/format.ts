const brl = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });
const brlShort = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", notation: "compact", maximumFractionDigits: 1 });

export const money = (n: number) => brl.format(n);
export const moneyShort = (n: number) => (Math.abs(n) >= 10_000 ? brlShort.format(n) : brl.format(Math.round(n)));
// Rótulo curto para eixo de gráfico: "4,5 mil", "−1,2 mil", "800".
export const axisLabel = (n: number) => {
  const sign = n < 0 ? "−" : "";
  const v = Math.abs(n);
  return v >= 1000 ? `${sign}${(v / 1000).toFixed(v % 1000 === 0 ? 0 : 1).replace(".", ",")} mil` : `${sign}${Math.round(v)}`;
};

export const pct = (n: number) => `${n >= 0 ? "" : "−"}${Math.abs(Math.round(n * 100))}%`;

const MONTHS = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];
const MONTHS_FULL = ["janeiro", "fevereiro", "março", "abril", "maio", "junho", "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"];

// "2026-10" -> "out/26" ou "outubro de 2026"
export const monthLabel = (ym: string, full = false) => {
  const [y, m] = ym.split("-").map(Number);
  return full ? `${MONTHS_FULL[m - 1]} de ${y}` : `${MONTHS[m - 1]}/${String(y).slice(2)}`;
};

export const dayLabel = (date: string) => {
  const [, m, d] = date.split("-").map(Number);
  return `${d} ${MONTHS[m - 1]}`;
};

export const shiftMonth = (ym: string, delta: number) => {
  const [y, m] = ym.split("-").map(Number);
  const d = new Date(y, m - 1 + delta, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
};
