"use client";

import { useState } from "react";
import { PiggyBank, Wand2 } from "lucide-react";
import { toast } from "sonner";
import { CategoryIcon } from "@/components/category-icon";
import { EmptyState, Money, MonthSwitcher, PageHeader, PageSkeleton } from "@/components/common";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { byCategory, monthsWithData, summary } from "@/lib/analytics";
import { shiftMonth } from "@/lib/format";
import { useHydrated, useMoney } from "@/lib/store";

export default function Metas() {
  const hydrated = useHydrated();
  const txs = useMoney((s) => s.txs);
  const categories = useMoney((s) => s.categories);
  const savingsGoal = useMoney((s) => s.savingsGoal);
  const setSavingsGoal = useMoney((s) => s.setSavingsGoal);
  const setBudget = useMoney((s) => s.setBudget);
  const [picked, setPicked] = useState<string | null>(null);

  if (!hydrated) return <PageSkeleton />;
  if (txs.length === 0)
    return (
      <>
        <PageHeader title="Metas" />
        <EmptyState />
      </>
    );

  const months = monthsWithData(txs);
  const month = picked && months.includes(picked) ? picked : months[months.length - 1];
  const spent = new Map(byCategory(txs, month, categories).map((c) => [c.id, c.value]));
  const s = summary(txs, month, categories);
  const target = s.income * savingsGoal;
  const expenseCats = categories.filter((c) => c.kind === "expense");

  // Orçamento sugerido: média dos últimos 3 meses, arredondada para cima de 10 em 10.
  const suggest = () => {
    let n = 0;
    for (const c of expenseCats) {
      const values = [1, 2, 3].map((k) => byCategory(txs, shiftMonth(month, -k + 1), categories).find((x) => x.id === c.id)?.value ?? 0);
      const avg = values.reduce((a, b) => a + b, 0) / 3;
      if (avg > 0) {
        setBudget(c.id, Math.ceil(avg / 10) * 10);
        n++;
      }
    }
    toast.success(`${n} orçamentos sugeridos`, { description: "Pela média dos últimos 3 meses. Ajuste à vontade." });
  };

  return (
    <div className="space-y-6">
      <PageHeader title="Metas" description="Quanto guardar e quanto gastar em cada categoria.">
        <MonthSwitcher month={month} months={months} onChange={setPicked} />
      </PageHeader>

      <Card className="rise-in">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <PiggyBank className="size-5 text-primary" /> Meta de poupança
          </CardTitle>
          <CardDescription>Quanto da renda você quer guardar por mês.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="flex items-center gap-4">
            <input
              type="range"
              min={0}
              max={60}
              step={5}
              value={Math.round(savingsGoal * 100)}
              onChange={(e) => setSavingsGoal(Number(e.target.value) / 100)}
              className="flex-1 accent-[var(--primary)]"
              aria-label="Meta de poupança em porcentagem"
            />
            <span className="w-14 text-right font-mono text-2xl font-semibold">{Math.round(savingsGoal * 100)}%</span>
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-lg border border-border p-3">
              <p className="text-xs text-muted-foreground">Meta do mês</p>
              <Money value={target} className="font-mono text-lg" />
            </div>
            <div className="rounded-lg border border-border p-3">
              <p className="text-xs text-muted-foreground">Sobrou de verdade</p>
              <Money value={s.net} className={`font-mono text-lg ${s.net >= target ? "text-primary" : "text-destructive"}`} />
            </div>
            <div className="rounded-lg border border-border p-3">
              <p className="text-xs text-muted-foreground">{s.net >= target ? "Passou da meta em" : "Faltou"}</p>
              <Money value={Math.abs(s.net - target)} className="font-mono text-lg" />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="rise-in">
        <CardHeader>
          <CardTitle>Orçamento por categoria</CardTitle>
          <CardDescription>Deixe em branco para não ter limite.</CardDescription>
          <div className="col-start-2 row-span-2 row-start-1 self-start justify-self-end">
            <Button variant="outline" size="sm" onClick={suggest}>
              <Wand2 /> Sugerir pelo histórico
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <ul className="divide-y divide-border">
            {expenseCats.map((c) => {
              const value = spent.get(c.id) ?? 0;
              const pct = c.budget ? value / c.budget : 0;
              return (
                <li key={c.id} className="grid grid-cols-[auto_1fr_auto] items-center gap-x-3 gap-y-2 py-3 sm:grid-cols-[auto_12rem_1fr_9rem]">
                  <CategoryIcon category={c} />
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{c.name}</p>
                    <p className="text-xs text-muted-foreground">
                      gasto: <Money value={value} />
                    </p>
                  </div>
                  <div className="col-span-3 row-start-2 sm:col-span-1 sm:row-start-auto">
                    {c.budget ? (
                      <div className="flex items-center gap-2">
                        <div className="h-2 flex-1 overflow-hidden rounded-full bg-muted">
                          <div className="h-full rounded-full" style={{ width: `${Math.min(100, pct * 100)}%`, background: pct > 1 ? "var(--destructive)" : c.color }} />
                        </div>
                        <span className="w-10 text-right font-mono text-xs text-muted-foreground">{Math.round(pct * 100)}%</span>
                        {pct > 1 && <Badge variant="destructive">estourou</Badge>}
                      </div>
                    ) : (
                      <span className="text-xs text-muted-foreground">sem limite</span>
                    )}
                  </div>
                  <div className="relative col-start-3 row-start-1 sm:col-start-auto sm:row-start-auto">
                    <span className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">R$</span>
                    <Input
                      type="number"
                      inputMode="decimal"
                      min={0}
                      step={10}
                      placeholder="limite"
                      value={c.budget ?? ""}
                      onChange={(e) => setBudget(c.id, e.target.value === "" ? undefined : Math.max(0, Number(e.target.value)))}
                      className="money h-8 w-32 pl-8 text-right font-mono sm:w-36"
                      aria-label={`Limite mensal de ${c.name}`}
                    />
                  </div>
                </li>
              );
            })}
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
