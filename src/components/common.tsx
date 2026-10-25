"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { ChevronLeft, ChevronRight, PiggyBank, Sparkles, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { money, monthLabel } from "@/lib/format";
import { useMoney } from "@/lib/store";
import { cn } from "@/lib/utils";

// Valor em reais. Ganha a classe .money, que o modo privacidade desfoca.
export function Money({ value, className, signed, colored }: { value: number; className?: string; signed?: boolean; colored?: boolean }) {
  const text = signed && value > 0 ? `+${money(value)}` : money(value);
  return <span className={cn("money", colored && (value >= 0 ? "text-primary" : "text-foreground"), className)}>{text}</span>;
}

export function PageHeader({ title, description, children }: { title: string; description?: string; children?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">{title}</h1>
        {description && <p className="mt-1 text-sm text-muted-foreground">{description}</p>}
      </div>
      {children}
    </div>
  );
}

export function MonthSwitcher({ month, months, onChange }: { month: string; months: string[]; onChange: (m: string) => void }) {
  const i = months.indexOf(month);
  return (
    <div className="flex items-center gap-1 rounded-lg border border-border bg-card p-1">
      <Button variant="ghost" size="icon-sm" aria-label="Mês anterior" disabled={i <= 0} onClick={() => onChange(months[i - 1])}>
        <ChevronLeft />
      </Button>
      <span className="min-w-32 text-center text-sm font-medium capitalize">{monthLabel(month, true)}</span>
      <Button variant="ghost" size="icon-sm" aria-label="Próximo mês" disabled={i >= months.length - 1} onClick={() => onChange(months[i + 1])}>
        <ChevronRight />
      </Button>
    </div>
  );
}

export function EmptyState() {
  const loadDemo = useMoney((s) => s.loadDemo);
  return (
    <div className="rise-in mx-auto flex max-w-lg flex-col items-center rounded-2xl border border-dashed border-border bg-card/50 px-6 py-14 text-center">
      <span className="flex size-14 items-center justify-center rounded-2xl bg-primary/15 text-primary">
        <PiggyBank className="size-8" />
      </span>
      <h2 className="mt-5 text-xl font-semibold">Seu cofrinho está vazio</h2>
      <p className="mt-2 text-sm text-muted-foreground">
        Importe o extrato do seu banco em OFX ou CSV. Ele é lido aqui no navegador e nunca é enviado para lugar nenhum.
      </p>
      <div className="mt-6 flex flex-wrap justify-center gap-2">
        <Button nativeButton={false} render={<Link href="/importar" />}>
          <Upload /> Importar extrato
        </Button>
        <Button variant="outline" onClick={loadDemo}>
          <Sparkles /> Ver com dados de exemplo
        </Button>
      </div>
    </div>
  );
}

export function PageSkeleton() {
  return (
    <div className="space-y-4" aria-busy>
      <Skeleton className="h-9 w-48" />
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-28" />
        ))}
      </div>
      <Skeleton className="h-80" />
    </div>
  );
}

export function Delta({ now, before, inverse }: { now: number; before: number; inverse?: boolean }) {
  if (!before) return <span className="text-xs text-muted-foreground">sem mês anterior</span>;
  const d = (now - before) / Math.abs(before);
  const good = inverse ? d <= 0 : d >= 0;
  return (
    <span className={cn("text-xs font-medium", good ? "text-primary" : "text-destructive")}>
      {d >= 0 ? "▲" : "▼"} {Math.abs(Math.round(d * 100))}% <span className="font-normal text-muted-foreground">vs. mês anterior</span>
    </span>
  );
}
