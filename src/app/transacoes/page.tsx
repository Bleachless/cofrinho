"use client";

import { useMemo, useState } from "react";
import { Search, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { CategoryIcon } from "@/components/category-icon";
import { EmptyState, Money, PageHeader, PageSkeleton } from "@/components/common";
import { SimpleSelect } from "@/components/simple-select";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { monthOf, monthsWithData } from "@/lib/analytics";
import { merchantOf, normalize } from "@/lib/categories";
import { dayLabel, monthLabel } from "@/lib/format";
import { useHydrated, useMoney } from "@/lib/store";
import type { Tx } from "@/lib/types";

const PAGE = 60;

export default function Transacoes() {
  const hydrated = useHydrated();
  const txs = useMoney((s) => s.txs);
  const categories = useMoney((s) => s.categories);
  const setCategory = useMoney((s) => s.setCategory);
  const addRule = useMoney((s) => s.addRule);
  const deleteTx = useMoney((s) => s.deleteTx);
  const [q, setQ] = useState("");
  const [month, setMonth] = useState("todos");
  const [cat, setCat] = useState("todas");
  const [type, setType] = useState("todas");
  const [limit, setLimit] = useState(PAGE);

  const filtered = useMemo(() => {
    const term = normalize(q);
    return txs.filter(
      (t) =>
        (month === "todos" || monthOf(t.date) === month) &&
        (cat === "todas" || t.categoryId === cat) &&
        (type === "todas" || (type === "entradas" ? t.amount > 0 : t.amount < 0)) &&
        (!term || normalize(t.description).includes(term)),
    );
  }, [txs, q, month, cat, type]);

  if (!hydrated) return <PageSkeleton />;
  if (txs.length === 0)
    return (
      <>
        <PageHeader title="Transações" />
        <EmptyState />
      </>
    );

  const catOf = (id: string) => categories.find((c) => c.id === id);
  const catOptions = categories.map((c) => ({ value: c.id, label: c.name, icon: <CategoryIcon category={c} size="sm" /> }));
  const total = filtered.reduce((s, t) => s + t.amount, 0);

  // Trocar a categoria de uma transação e oferecer uma regra para as próximas.
  const change = (t: Tx, categoryId: string) => {
    setCategory(t.id, categoryId);
    const word = merchantOf(t.description).toLowerCase();
    const name = catOf(categoryId)?.name;
    toast.success(`Categoria trocada para ${name}`, {
      description: `Sempre que aparecer “${word}”, usar ${name}?`,
      action: {
        label: "Criar regra",
        onClick: () => {
          const n = addRule(word, categoryId);
          toast.success(`Regra criada`, { description: `${n} transação(ões) reclassificada(s).` });
        },
      },
    });
  };

  return (
    <div>
      <PageHeader title="Transações" description={`${txs.length} lançamentos importados`} />

      <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar: ifood, uber, aluguel..." className="h-9 pl-8" />
        </div>
        <div className="grid grid-cols-2 gap-2 sm:flex">
          <SimpleSelect
            label="Mês"
            value={month}
            onChange={setMonth}
            className="h-9 w-full sm:w-40"
            options={[{ value: "todos", label: "Todos os meses" }, ...monthsWithData(txs).reverse().map((m) => ({ value: m, label: monthLabel(m, true) }))]}
          />
          <SimpleSelect
            label="Categoria"
            value={cat}
            onChange={setCat}
            className="h-9 w-full sm:w-48"
            options={[{ value: "todas", label: "Todas as categorias" }, ...catOptions]}
          />
        </div>
        <Tabs value={type} onValueChange={(v) => setType(String(v))}>
          <TabsList>
            <TabsTrigger value="todas">Todas</TabsTrigger>
            <TabsTrigger value="entradas">Entradas</TabsTrigger>
            <TabsTrigger value="saidas">Saídas</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      <div className="mb-3 flex items-center justify-between text-sm text-muted-foreground">
        <span>{filtered.length} resultado(s)</span>
        <span>
          Total: <Money value={total} signed colored className="font-mono font-medium" />
        </span>
      </div>

      {/* Desktop: tabela */}
      <Card className="hidden py-0 md:flex">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-24 pl-4">Data</TableHead>
              <TableHead>Descrição</TableHead>
              <TableHead className="w-60">Categoria</TableHead>
              <TableHead className="w-36 text-right">Valor</TableHead>
              <TableHead className="w-12" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.slice(0, limit).map((t) => (
              <TableRow key={t.id}>
                <TableCell className="pl-4 text-muted-foreground">{dayLabel(t.date)}</TableCell>
                <TableCell className="max-w-0">
                  <div className="flex items-center gap-2">
                    <span className="truncate">{t.description}</span>
                    {t.manual && <Badge variant="outline">manual</Badge>}
                  </div>
                </TableCell>
                <TableCell>
                  <SimpleSelect label="Categoria da transação" size="sm" value={t.categoryId} onChange={(v) => change(t, v)} className="w-56" options={catOptions} />
                </TableCell>
                <TableCell className="text-right">
                  <Money value={t.amount} signed colored className="font-mono" />
                </TableCell>
                <TableCell>
                  <Button variant="ghost" size="icon-sm" aria-label="Apagar transação" onClick={() => deleteTx(t.id)}>
                    <Trash2 className="text-muted-foreground" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>

      {/* Celular: lista */}
      <ul className="space-y-2 md:hidden">
        {filtered.slice(0, limit).map((t) => {
          const c = catOf(t.categoryId);
          return (
            <li key={t.id} className="rounded-xl border border-border bg-card p-3">
              <div className="flex items-start gap-3">
                {c && <CategoryIcon category={c} />}
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm">{t.description}</p>
                  <p className="text-xs text-muted-foreground">{dayLabel(t.date)}</p>
                </div>
                <Money value={t.amount} signed colored className="font-mono text-sm" />
              </div>
              <SimpleSelect label="Categoria da transação" size="sm" value={t.categoryId} onChange={(v) => change(t, v)} className="mt-2 w-full" options={catOptions} />
            </li>
          );
        })}
      </ul>

      {filtered.length > limit && (
        <div className="mt-4 flex justify-center">
          <Button variant="outline" onClick={() => setLimit((l) => l + PAGE)}>
            Mostrar mais ({filtered.length - limit})
          </Button>
        </div>
      )}
      {filtered.length === 0 && <p className="py-12 text-center text-sm text-muted-foreground">Nada encontrado com esses filtros.</p>}
    </div>
  );
}
