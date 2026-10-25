"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import { Download, FileCheck2, FileUp, Lock, RotateCcw, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { CategoryIcon } from "@/components/category-icon";
import { Money, PageHeader } from "@/components/common";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { categorize, DEFAULT_RULES } from "@/lib/categories";
import { dayLabel } from "@/lib/format";
import { parseFile, txKey, type CsvResult } from "@/lib/parse";
import { demoTransactions, sampleCsv, sampleOfx } from "@/lib/seed";
import { useMoney } from "@/lib/store";
import { cn } from "@/lib/utils";

function download(name: string, text: string, type: string) {
  const a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob([text], { type }));
  a.download = name;
  a.click();
  URL.revokeObjectURL(a.href);
}

export default function Importar() {
  const importRows = useMoney((s) => s.importRows);
  const keys = useMoney((s) => s.keys);
  const rules = useMoney((s) => s.rules);
  const categories = useMoney((s) => s.categories);
  const input = useRef<HTMLInputElement>(null);
  const [drag, setDrag] = useState(false);
  const [file, setFile] = useState<{ name: string; result: CsvResult } | null>(null);
  const [invert, setInvert] = useState(false);
  const [done, setDone] = useState<{ added: number; duplicated: number } | null>(null);

  const read = async (f: File) => {
    setDone(null);
    try {
      const result = await parseFile(f);
      setFile({ name: f.name, result });
      setInvert(result.looksLikeCard);
      if (result.rows.length === 0) toast.error("Não encontrei transações nesse arquivo", { description: result.format });
    } catch {
      toast.error("Não consegui ler esse arquivo");
    }
  };

  const rows = (file?.result.rows ?? []).map((r) => (invert ? { ...r, amount: -r.amount } : r));
  const seen = new Set(keys);
  const duplicated = rows.filter((r) => seen.has(txKey(r))).length;
  const kindOf = (id: string) => categories.find((c) => c.id === id)?.kind;
  const allRules = [...rules, ...DEFAULT_RULES];
  const dates = rows.map((r) => r.date).sort();
  const income = rows.filter((r) => r.amount > 0).reduce((s, r) => s + r.amount, 0);
  const expense = rows.filter((r) => r.amount < 0).reduce((s, r) => s - r.amount, 0);

  const confirm = () => {
    const res = importRows(rows, file?.name.toLowerCase().endsWith(".ofx") ? "ofx" : "csv");
    setDone(res);
    setFile(null);
    toast.success(`${res.added} transações importadas`, { description: res.duplicated ? `${res.duplicated} já estavam aqui e foram ignoradas.` : undefined });
  };

  return (
    <div className="space-y-6">
      <PageHeader title="Importar extrato" description="OFX ou CSV do seu banco ou cartão. Tudo é lido aqui no navegador." />

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <button
            type="button"
            onClick={() => input.current?.click()}
            onDragOver={(e) => {
              e.preventDefault();
              setDrag(true);
            }}
            onDragLeave={() => setDrag(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDrag(false);
              const f = e.dataTransfer.files[0];
              if (f) void read(f);
            }}
            className={cn(
              "flex w-full flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed px-6 py-14 text-center transition",
              drag ? "border-primary bg-primary/10" : "border-border bg-card/50 hover:border-primary/60",
            )}
          >
            <span className="flex size-14 items-center justify-center rounded-2xl bg-primary/15 text-primary">
              <FileUp className="size-7" />
            </span>
            <span className="text-lg font-medium">Arraste o extrato aqui</span>
            <span className="text-sm text-muted-foreground">ou clique para escolher · .ofx, .csv</span>
          </button>
          <input
            ref={input}
            type="file"
            accept=".ofx,.qfx,.csv,.txt"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) void read(f);
              e.target.value = "";
            }}
          />
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Lock className="size-4 text-primary" /> Seus dados ficam com você
            </CardTitle>
            <CardDescription>
              O arquivo é lido no próprio navegador. Nada é enviado para servidor, nem para mim. Fica salvo só neste aparelho.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            <p className="text-xs text-muted-foreground">Sem um extrato à mão? Baixe um exemplo e importe:</p>
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" size="sm" onClick={() => download("extrato-exemplo.csv", sampleCsv(demoTransactions()), "text/csv")}>
                <Download /> CSV
              </Button>
              <Button variant="outline" size="sm" onClick={() => download("extrato-exemplo.ofx", sampleOfx(demoTransactions()), "application/x-ofx")}>
                <Download /> OFX
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {done && (
        <Card className="rise-in border-primary/40">
          <CardContent className="flex flex-wrap items-center gap-4">
            <FileCheck2 className="size-8 text-primary" />
            <div className="flex-1">
              <p className="font-medium">{done.added} transações importadas</p>
              <p className="text-sm text-muted-foreground">{done.duplicated ? `${done.duplicated} repetidas foram ignoradas.` : "Nenhuma repetida."}</p>
            </div>
            <Button nativeButton={false} render={<Link href="/" />}>
              <Sparkles /> Ver no painel
            </Button>
          </CardContent>
        </Card>
      )}

      {file && rows.length > 0 && (
        <Card className="rise-in">
          <CardHeader>
            <CardTitle>{file.name}</CardTitle>
            <CardDescription>
              {file.result.format} · {rows.length} transações de {dayLabel(dates[0])} a {dayLabel(dates[dates.length - 1])}
              {file.result.skipped ? ` · ${file.result.skipped} linha(s) ignorada(s)` : ""}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="rounded-lg border border-border p-3">
                <p className="text-xs text-muted-foreground">Entradas</p>
                <Money value={income} className="font-mono text-lg text-primary" />
              </div>
              <div className="rounded-lg border border-border p-3">
                <p className="text-xs text-muted-foreground">Saídas</p>
                <Money value={expense} className="font-mono text-lg" />
              </div>
              <div className="rounded-lg border border-border p-3">
                <p className="text-xs text-muted-foreground">Já importadas antes</p>
                <p className="font-mono text-lg">{duplicated}</p>
              </div>
            </div>

            <label className="flex items-center justify-between gap-4 rounded-lg border border-border p-3 text-sm">
              <span>
                <span className="font-medium">Inverter sinais</span>
                <span className="block text-xs text-muted-foreground">
                  Use para fatura de cartão, que lista gastos como valores positivos.{file.result.looksLikeCard && " Parece ser o caso."}
                </span>
              </span>
              <Switch checked={invert} onCheckedChange={setInvert} />
            </label>

            <div className="overflow-x-auto rounded-lg border border-border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="pl-3">Data</TableHead>
                    <TableHead>Descrição</TableHead>
                    <TableHead>Categoria</TableHead>
                    <TableHead className="pr-3 text-right">Valor</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.slice(0, 8).map((r, i) => {
                    const c = categories.find((x) => x.id === categorize(r.description, r.amount, allRules, kindOf));
                    return (
                      <TableRow key={i} className={cn(seen.has(txKey(r)) && "opacity-40")}>
                        <TableCell className="pl-3 text-muted-foreground">{dayLabel(r.date)}</TableCell>
                        <TableCell className="max-w-56 truncate">{r.description}</TableCell>
                        <TableCell>
                          {c && (
                            <span className="flex items-center gap-2">
                              <CategoryIcon category={c} size="sm" />
                              {c.name}
                            </span>
                          )}
                        </TableCell>
                        <TableCell className="pr-3 text-right">
                          <Money value={r.amount} signed colored className="font-mono" />
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
            {rows.length > 8 && <p className="text-xs text-muted-foreground">Mostrando 8 de {rows.length}.</p>}

            <div className="flex flex-wrap justify-end gap-2">
              <Button variant="ghost" onClick={() => setFile(null)}>
                <RotateCcw /> Escolher outro
              </Button>
              <Button onClick={confirm} disabled={rows.length === duplicated}>
                Importar {rows.length - duplicated} transações
              </Button>
            </div>
            {duplicated > 0 && (
              <Badge variant="outline" className="ml-auto block w-fit">
                {duplicated} repetida(s) serão ignoradas
              </Badge>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
