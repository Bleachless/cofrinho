"use client";

import Link from "next/link";
import { useState } from "react";
import { ArrowDownLeft, ArrowUpRight, Lightbulb, PiggyBank, TrendingDown, TrendingUp, Wallet } from "lucide-react";
import { BalanceChart, CashflowChart, CategoryDonut, MerchantsChart } from "@/components/charts";
import { Delta, EmptyState, Money, MonthSwitcher, PageHeader, PageSkeleton } from "@/components/common";
import { CategoryIcon } from "@/components/category-icon";
import { Badge } from "@/components/ui/badge";
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { budgets, byCategory, dailyBalance, insights, monthlySeries, monthsWithData, summary, topMerchants } from "@/lib/analytics";
import { dayLabel, shiftMonth } from "@/lib/format";
import { useHydrated, useMoney } from "@/lib/store";
import { cn } from "@/lib/utils";

function Kpi({ title, icon: Icon, children, footer, accent }: { title: string; icon: typeof Wallet; children: React.ReactNode; footer: React.ReactNode; accent?: string }) {
  return (
    <Card className="rise-in">
      <CardHeader>
        <CardDescription>{title}</CardDescription>
        <CardAction>
          <span className={cn("flex size-8 items-center justify-center rounded-lg bg-muted", accent)}>
            <Icon className="size-4" />
          </span>
        </CardAction>
        <CardTitle className="font-mono text-2xl font-semibold tracking-tight sm:text-[1.7rem]">{children}</CardTitle>
      </CardHeader>
      <CardContent className="-mt-1">{footer}</CardContent>
    </Card>
  );
}

export default function Dashboard() {
  const hydrated = useHydrated();
  const txs = useMoney((s) => s.txs);
  const categories = useMoney((s) => s.categories);
  const savingsGoal = useMoney((s) => s.savingsGoal);
  const [picked, setPicked] = useState<string | null>(null);

  if (!hydrated) return <PageSkeleton />;
  if (txs.length === 0)
    return (
      <>
        <PageHeader title="Painel" description="Para onde está indo o seu dinheiro." />
        <EmptyState />
      </>
    );

  const months = monthsWithData(txs);
  const month = picked && months.includes(picked) ? picked : months[months.length - 1];
  const prev = shiftMonth(month, -1);
  const s = summary(txs, month, categories);
  const p = summary(txs, prev, categories);
  const cats = byCategory(txs, month, categories);
  const tips = insights(txs, month, categories, savingsGoal);
  const plans = budgets(txs, month, categories).slice(0, 6);
  const recent = txs.filter((t) => t.date.startsWith(month)).slice(0, 6);
  const catOf = (id: string) => categories.find((c) => c.id === id);

  return (
    <div className="space-y-4">
      <PageHeader title="Painel" description="Para onde está indo o seu dinheiro.">
        <MonthSwitcher month={month} months={months} onChange={setPicked} />
      </PageHeader>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Kpi title="Entradas" icon={ArrowDownLeft} accent="text-primary" footer={<Delta now={s.income} before={p.income} />}>
          <Money value={s.income} />
        </Kpi>
        <Kpi title="Saídas" icon={ArrowUpRight} accent="text-destructive" footer={<Delta now={s.expense} before={p.expense} inverse />}>
          <Money value={s.expense} />
        </Kpi>
        <Kpi title="Sobrou no mês" icon={Wallet} footer={<Delta now={s.net} before={p.net} />}>
          <Money value={s.net} className={s.net < 0 ? "text-destructive" : ""} />
        </Kpi>
        <Kpi
          title="Taxa de poupança"
          icon={PiggyBank}
          accent={s.savingsRate >= savingsGoal ? "text-primary" : "text-amber-400"}
          footer={
            <div className="space-y-1.5">
              <Progress value={Math.max(0, Math.min(100, (s.savingsRate / savingsGoal) * 100))} />
              <p className="text-xs text-muted-foreground">Meta: guardar {Math.round(savingsGoal * 100)}% da renda</p>
            </div>
          }
        >
          {Math.round(s.savingsRate * 100)}%
        </Kpi>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="rise-in lg:col-span-2">
          <CardHeader>
            <CardTitle>Entradas e saídas</CardTitle>
            <CardDescription>Últimos 6 meses, sem contar aplicações e pagamento de fatura</CardDescription>
          </CardHeader>
          <CardContent className="px-2 sm:px-4">
            <CashflowChart data={monthlySeries(txs, month, categories)} />
          </CardContent>
        </Card>

        <Card className="rise-in">
          <CardHeader>
            <CardTitle>Para onde foi</CardTitle>
            <CardDescription>Gastos por categoria</CardDescription>
          </CardHeader>
          <CardContent>
            {cats.length ? (
              <>
                <CategoryDonut data={cats} total={s.expense} />
                <ul className="mt-4 space-y-2">
                  {cats.slice(0, 5).map((c) => (
                    <li key={c.id} className="flex items-center gap-2 text-sm">
                      <span className="size-2.5 rounded-[3px]" style={{ background: c.color }} />
                      <span className="truncate">{c.name}</span>
                      <span className="ml-auto text-xs text-muted-foreground">{Math.round((c.value / s.expense) * 100)}%</span>
                      <Money value={c.value} className="w-24 text-right font-mono text-xs" />
                    </li>
                  ))}
                </ul>
              </>
            ) : (
              <p className="py-16 text-center text-sm text-muted-foreground">Nenhum gasto neste mês.</p>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="rise-in">
          <CardHeader>
            <CardTitle>Saldo ao longo do mês</CardTitle>
            <CardDescription>Entradas menos saídas, dia a dia</CardDescription>
          </CardHeader>
          <CardContent className="px-2 sm:px-4">
            <BalanceChart data={dailyBalance(txs, month, categories)} />
          </CardContent>
        </Card>

        <Card className="rise-in">
          <CardHeader>
            <CardTitle>Onde mais gastou</CardTitle>
            <CardDescription>Estabelecimentos do mês</CardDescription>
          </CardHeader>
          <CardContent className="px-2 sm:px-4">
            <MerchantsChart data={topMerchants(txs, month, categories)} />
          </CardContent>
        </Card>

        <Card className="rise-in">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Lightbulb className="size-4 text-amber-400" /> O que mudou
            </CardTitle>
            <CardDescription>Leitura automática do mês</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {tips.map((t) => (
              <div key={t.title} className="flex gap-3 rounded-lg border border-border bg-background/40 p-3">
                <span
                  className={cn(
                    "mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-md",
                    t.tone === "good" ? "bg-primary/15 text-primary" : t.tone === "bad" ? "bg-destructive/15 text-destructive" : "bg-muted text-muted-foreground",
                  )}
                >
                  {t.tone === "bad" ? <TrendingUp className="size-4" /> : t.tone === "good" ? <TrendingDown className="size-4" /> : <Lightbulb className="size-4" />}
                </span>
                <div>
                  <p className="text-sm font-medium">{t.title}</p>
                  <p className="text-xs text-muted-foreground">{t.detail}</p>
                </div>
              </div>
            ))}
            {tips.length === 0 && <p className="text-sm text-muted-foreground">Importe mais um mês para eu comparar.</p>}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="rise-in">
          <CardHeader>
            <CardTitle>Orçamentos</CardTitle>
            <CardDescription>Quanto já foi do limite de cada categoria</CardDescription>
            <CardAction>
              <Link href="/metas" className="text-xs text-primary hover:underline">
                Ajustar
              </Link>
            </CardAction>
          </CardHeader>
          <CardContent className="space-y-4">
            {plans.map((b) => (
              <div key={b.id} className="space-y-1.5">
                <div className="flex items-center gap-2 text-sm">
                  <CategoryIcon category={b} />
                  <span>{b.name}</span>
                  {b.pct > 1 && <Badge variant="destructive">estourou</Badge>}
                  {b.pct > 0.8 && b.pct <= 1 && <Badge variant="outline" className="border-amber-400/40 text-amber-400">quase lá</Badge>}
                  <span className="ml-auto font-mono text-xs text-muted-foreground">
                    <Money value={b.spent} /> / <Money value={b.budget ?? 0} />
                  </span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full rounded-full transition-all"
                    style={{ width: `${Math.min(100, b.pct * 100)}%`, background: b.pct > 1 ? "var(--destructive)" : b.color }}
                  />
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="rise-in">
          <CardHeader>
            <CardTitle>Últimas transações</CardTitle>
            <CardDescription>Do mês selecionado</CardDescription>
            <CardAction>
              <Link href="/transacoes" className="text-xs text-primary hover:underline">
                Ver todas
              </Link>
            </CardAction>
          </CardHeader>
          <CardContent>
            <ul className="divide-y divide-border">
              {recent.map((t) => {
                const c = catOf(t.categoryId);
                return (
                  <li key={t.id} className="flex items-center gap-3 py-2.5">
                    {c && <CategoryIcon category={c} />}
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm">{t.description}</p>
                      <p className="text-xs text-muted-foreground">
                        {dayLabel(t.date)} · {c?.name}
                      </p>
                    </div>
                    <Money value={t.amount} signed colored className="font-mono text-sm" />
                  </li>
                );
              })}
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
