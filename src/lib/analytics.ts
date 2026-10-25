import { merchantOf } from "./categories";
import { shiftMonth } from "./format";
import type { Category, Tx } from "./types";

export const monthOf = (date: string) => date.slice(0, 7);

const catMap = (categories: Category[]) => new Map(categories.map((c) => [c.id, c]));

// Transferências (fatura, aplicação, entre contas) não são ganho nem gasto.
function counted(txs: Tx[], categories: Category[]) {
  const cats = catMap(categories);
  return txs.filter((t) => cats.get(t.categoryId)?.kind !== "transfer");
}

export function monthsWithData(txs: Tx[]) {
  return [...new Set(txs.map((t) => monthOf(t.date)))].sort();
}

export function summary(txs: Tx[], ym: string, categories: Category[]) {
  let income = 0;
  let expense = 0;
  for (const t of counted(txs, categories)) {
    if (monthOf(t.date) !== ym) continue;
    if (t.amount >= 0) income += t.amount;
    else expense -= t.amount;
  }
  const net = income - expense;
  return { income, expense, net, savingsRate: income > 0 ? net / income : 0 };
}

export function byCategory(txs: Tx[], ym: string, categories: Category[]) {
  const cats = catMap(categories);
  const sums = new Map<string, number>();
  for (const t of counted(txs, categories)) {
    if (monthOf(t.date) !== ym || t.amount >= 0) continue;
    sums.set(t.categoryId, (sums.get(t.categoryId) ?? 0) - t.amount);
  }
  return [...sums.entries()]
    .map(([id, value]) => ({ id, name: cats.get(id)?.name ?? id, color: cats.get(id)?.color ?? "#a3a3a3", value: Math.round(value * 100) / 100 }))
    .sort((a, b) => b.value - a.value);
}

export function monthlySeries(txs: Tx[], ym: string, categories: Category[], months = 6) {
  return Array.from({ length: months }, (_, i) => {
    const m = shiftMonth(ym, i - months + 1);
    const s = summary(txs, m, categories);
    return { month: m, entradas: Math.round(s.income), saidas: Math.round(s.expense), saldo: Math.round(s.net) };
  });
}

// Saldo do mês acumulado dia a dia.
export function dailyBalance(txs: Tx[], ym: string, categories: Category[]) {
  const [y, m] = ym.split("-").map(Number);
  const days = new Date(y, m, 0).getDate();
  const perDay = new Array(days).fill(0);
  let last = 0;
  for (const t of counted(txs, categories)) {
    if (monthOf(t.date) !== ym) continue;
    const d = Number(t.date.slice(8, 10));
    perDay[d - 1] += t.amount;
    last = Math.max(last, d);
  }
  let acc = 0;
  return perDay.slice(0, last || days).map((v, i) => {
    acc += v;
    return { dia: i + 1, saldo: Math.round(acc) };
  });
}

export function topMerchants(txs: Tx[], ym: string, categories: Category[], n = 6) {
  const sums = new Map<string, { value: number; count: number }>();
  for (const t of counted(txs, categories)) {
    if (monthOf(t.date) !== ym || t.amount >= 0) continue;
    const k = merchantOf(t.description);
    const cur = sums.get(k) ?? { value: 0, count: 0 };
    sums.set(k, { value: cur.value - t.amount, count: cur.count + 1 });
  }
  return [...sums.entries()]
    .map(([name, v]) => ({ name, value: Math.round(v.value), count: v.count }))
    .sort((a, b) => b.value - a.value)
    .slice(0, n);
}

export function budgets(txs: Tx[], ym: string, categories: Category[]) {
  const spent = new Map(byCategory(txs, ym, categories).map((c) => [c.id, c.value]));
  return categories
    .filter((c) => c.kind === "expense" && c.budget)
    .map((c) => {
      const s = spent.get(c.id) ?? 0;
      return { ...c, spent: s, pct: s / (c.budget ?? 1) };
    })
    .sort((a, b) => b.pct - a.pct);
}

export type Insight = { tone: "good" | "bad" | "neutral"; title: string; detail: string };

// Frases curtas sobre o mês, comparando com o mês anterior.
export function insights(txs: Tx[], ym: string, categories: Category[], savingsGoal: number): Insight[] {
  const out: Insight[] = [];
  const prev = shiftMonth(ym, -1);
  const now = new Map(byCategory(txs, ym, categories).map((c) => [c.id, c]));
  const before = new Map(byCategory(txs, prev, categories).map((c) => [c.id, c]));

  const changes = [...now.values()]
    .map((c) => ({ ...c, before: before.get(c.id)?.value ?? 0 }))
    .filter((c) => c.before > 50)
    .map((c) => ({ ...c, delta: (c.value - c.before) / c.before }))
    .sort((a, b) => b.delta - a.delta);

  const up = changes[0];
  if (up && up.delta > 0.15)
    out.push({ tone: "bad", title: `${up.name} subiu ${Math.round(up.delta * 100)}%`, detail: `Em relação ao mês anterior. Vale dar uma olhada.` });
  const down = changes[changes.length - 1];
  if (down && down.delta < -0.15)
    out.push({ tone: "good", title: `${down.name} caiu ${Math.round(-down.delta * 100)}%`, detail: `Menos gasto que no mês anterior. Boa!` });

  const s = summary(txs, ym, categories);
  if (s.income > 0) {
    out.push(
      s.savingsRate >= savingsGoal
        ? { tone: "good", title: `Guardou ${Math.round(s.savingsRate * 100)}% da renda`, detail: `Acima da meta de ${Math.round(savingsGoal * 100)}%. O porquinho agradece.` }
        : { tone: "bad", title: `Guardou ${Math.max(0, Math.round(s.savingsRate * 100))}% da renda`, detail: `A meta é ${Math.round(savingsGoal * 100)}%. Ainda dá tempo de segurar.` },
    );
  }

  const delivery = txs.filter((t) => monthOf(t.date) === ym && t.categoryId === "delivery").length;
  if (delivery >= 6) out.push({ tone: "neutral", title: `${delivery} pedidos de delivery`, detail: "Quase dois por semana. O fogão sente sua falta." });

  return out.slice(0, 4);
}
