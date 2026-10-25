"use client";

import { useMemo, useState } from "react";
import { ArrowRight, RefreshCw, Sparkles, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { CategoryIcon } from "@/components/category-icon";
import { PageHeader, PageSkeleton } from "@/components/common";
import { SimpleSelect } from "@/components/simple-select";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { DEFAULT_RULES, normalize } from "@/lib/categories";
import { useHydrated, useMoney } from "@/lib/store";

const KIND_LABEL = { expense: "Gasto", income: "Entrada", transfer: "Não conta" } as const;

export default function Regras() {
  const hydrated = useHydrated();
  const txs = useMoney((s) => s.txs);
  const rules = useMoney((s) => s.rules);
  const categories = useMoney((s) => s.categories);
  const addRule = useMoney((s) => s.addRule);
  const removeRule = useMoney((s) => s.removeRule);
  const reapplyRules = useMoney((s) => s.reapplyRules);
  const loadDemo = useMoney((s) => s.loadDemo);
  const clearAll = useMoney((s) => s.clearAll);
  const [match, setMatch] = useState("");
  const [categoryId, setCategoryId] = useState("delivery");

  const preview = useMemo(() => {
    const term = normalize(match);
    return term.length < 2 ? 0 : txs.filter((t) => normalize(t.description).includes(term)).length;
  }, [match, txs]);

  if (!hydrated) return <PageSkeleton />;

  const catOf = (id: string) => categories.find((c) => c.id === id);
  const catOptions = categories.map((c) => ({ value: c.id, label: c.name, icon: <CategoryIcon category={c} size="sm" /> }));
  const defaultsByCat = categories.map((c) => ({ c, words: DEFAULT_RULES.filter((r) => r.categoryId === c.id).map((r) => r.match) })).filter((x) => x.words.length);

  const create = () => {
    if (normalize(match).length < 2) return;
    const n = addRule(match, categoryId);
    toast.success("Regra criada", { description: `${n} transação(ões) reclassificada(s).` });
    setMatch("");
  };

  return (
    <div className="space-y-6">
      <PageHeader title="Regras" description="Como cada lançamento do extrato vira uma categoria.">
        <Button
          variant="outline"
          onClick={() => {
            const n = reapplyRules();
            toast.success("Regras reaplicadas", { description: `${n} transação(ões) mudaram de categoria.` });
          }}
        >
          <RefreshCw /> Reaplicar em tudo
        </Button>
      </PageHeader>

      <Card className="rise-in">
        <CardHeader>
          <CardTitle>Nova regra</CardTitle>
          <CardDescription>Suas regras vêm antes das padrão. Transações que você trocou à mão não são mexidas.</CardDescription>
        </CardHeader>
        <CardContent>
          <form
            className="flex flex-col gap-3 md:flex-row md:items-center"
            onSubmit={(e) => {
              e.preventDefault();
              create();
            }}
          >
            <span className="text-sm text-muted-foreground">Quando a descrição tiver</span>
            <Input value={match} onChange={(e) => setMatch(e.target.value)} placeholder="ex.: padaria do zé" className="h-9 md:w-56" />
            <ArrowRight className="hidden size-4 text-muted-foreground md:block" />
            <SimpleSelect label="Categoria" value={categoryId} onChange={setCategoryId} options={catOptions} className="h-9 w-full md:w-56" />
            <Button type="submit" disabled={normalize(match).length < 2}>
              Criar regra
            </Button>
          </form>
          {match.trim().length >= 2 && <p className="mt-2 text-xs text-muted-foreground">Bate com {preview} transação(ões) já importada(s).</p>}
        </CardContent>
      </Card>

      <Card className="rise-in">
        <CardHeader>
          <CardTitle>Suas regras</CardTitle>
          <CardDescription>{rules.length ? `${rules.length} regra(s)` : "Nenhuma ainda. Dica: ao trocar a categoria de uma transação, eu ofereço criar a regra."}</CardDescription>
        </CardHeader>
        {rules.length > 0 && (
          <CardContent>
            <ul className="divide-y divide-border">
              {rules.map((r) => {
                const c = catOf(r.categoryId);
                return (
                  <li key={r.id} className="flex items-center gap-3 py-2.5 text-sm">
                    <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs">{r.match}</code>
                    <ArrowRight className="size-3.5 text-muted-foreground" />
                    {c && <CategoryIcon category={c} size="sm" />}
                    <span>{c?.name}</span>
                    <Button variant="ghost" size="icon-sm" className="ml-auto" aria-label="Apagar regra" onClick={() => removeRule(r.id)}>
                      <Trash2 className="text-muted-foreground" />
                    </Button>
                  </li>
                );
              })}
            </ul>
          </CardContent>
        )}
      </Card>

      <Card className="rise-in">
        <CardHeader>
          <CardTitle>Regras padrão</CardTitle>
          <CardDescription>Palavras comuns em extratos de bancos brasileiros.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-2">
          {defaultsByCat.map(({ c, words }) => (
            <div key={c.id} className="rounded-lg border border-border p-3">
              <div className="mb-2 flex items-center gap-2 text-sm font-medium">
                <CategoryIcon category={c} size="sm" />
                {c.name}
                <Badge variant="outline" className="ml-auto">
                  {KIND_LABEL[c.kind]}
                </Badge>
              </div>
              <p className="text-xs leading-relaxed text-muted-foreground">{words.join(" · ")}</p>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card className="rise-in border-destructive/30">
        <CardHeader>
          <CardTitle>Seus dados</CardTitle>
          <CardDescription>Tudo fica salvo só neste navegador.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            onClick={() => {
              if (confirm("Trocar tudo por 6 meses de dados de exemplo?")) loadDemo();
            }}
          >
            <Sparkles /> Carregar exemplo
          </Button>
          <Button
            variant="destructive"
            onClick={() => {
              if (confirm("Apagar todas as transações e regras deste navegador? Não dá para desfazer.")) {
                clearAll();
                toast.success("Tudo apagado");
              }
            }}
          >
            <Trash2 /> Apagar tudo
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
