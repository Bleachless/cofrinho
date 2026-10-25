"use client";

import { Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, Label, Pie, PieChart, ReferenceLine, XAxis, YAxis } from "recharts";
import { ChartContainer, ChartLegend, ChartLegendContent, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart";
import { axisLabel, money, moneyShort, monthLabel } from "@/lib/format";

// Linha do tooltip com a bolinha da cor, o nome e o valor em reais (desfocável).
function moneyRow(config: ChartConfig) {
  return function Row(value: unknown, name: unknown, item: { color?: string; payload?: { fill?: string } }) {
    const key = String(name);
    return (
      <div className="flex w-full items-center gap-2">
        <span className="size-2.5 shrink-0 rounded-[3px]" style={{ background: item.color ?? item.payload?.fill }} />
        <span className="text-muted-foreground">{config[key]?.label ?? key}</span>
        <span className="money ml-auto pl-3 font-mono font-medium text-foreground">{money(Number(value))}</span>
      </div>
    );
  };
}

const flowConfig = {
  entradas: { label: "Entradas", color: "var(--chart-1)" },
  saidas: { label: "Saídas", color: "var(--chart-2)" },
} satisfies ChartConfig;

export function CashflowChart({ data }: { data: { month: string; entradas: number; saidas: number }[] }) {
  return (
    <ChartContainer config={flowConfig} className="aspect-auto h-[260px] w-full lg:h-[400px]">
      <AreaChart data={data} margin={{ left: 4, right: 12, top: 8 }}>
        <defs>
          <linearGradient id="fill-entradas" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="var(--color-entradas)" stopOpacity={0.45} />
            <stop offset="95%" stopColor="var(--color-entradas)" stopOpacity={0.02} />
          </linearGradient>
          <linearGradient id="fill-saidas" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="var(--color-saidas)" stopOpacity={0.4} />
            <stop offset="95%" stopColor="var(--color-saidas)" stopOpacity={0.02} />
          </linearGradient>
        </defs>
        <CartesianGrid vertical={false} strokeDasharray="3 6" />
        <XAxis dataKey="month" tickLine={false} axisLine={false} tickMargin={10} tickFormatter={(m: string) => monthLabel(m)} />
        <YAxis tickLine={false} axisLine={false} width={52} tickFormatter={(v: number) => axisLabel(v)} className="money" />
        <ChartTooltip
          cursor={false}
          content={<ChartTooltipContent indicator="dot" labelFormatter={(_, p) => monthLabel(String(p?.[0]?.payload?.month ?? ""), true)} formatter={moneyRow(flowConfig)} />}
        />
        <Area dataKey="saidas" type="natural" fill="url(#fill-saidas)" stroke="var(--color-saidas)" strokeWidth={2} />
        <Area dataKey="entradas" type="natural" fill="url(#fill-entradas)" stroke="var(--color-entradas)" strokeWidth={2} />
        <ChartLegend content={<ChartLegendContent />} />
      </AreaChart>
    </ChartContainer>
  );
}

export function CategoryDonut({ data, total }: { data: { id: string; name: string; color: string; value: number }[]; total: number }) {
  const config = Object.fromEntries(data.map((d) => [d.id, { label: d.name, color: d.color }])) satisfies ChartConfig;
  return (
    <ChartContainer config={config} className="mx-auto aspect-square h-[240px]">
      <PieChart>
        <ChartTooltip cursor={false} content={<ChartTooltipContent hideLabel nameKey="id" formatter={moneyRow(config)} />} />
        <Pie data={data} dataKey="value" nameKey="id" innerRadius={72} outerRadius={108} strokeWidth={3} stroke="var(--card)" paddingAngle={1.5}>
          {data.map((d) => (
            <Cell key={d.id} fill={d.color} />
          ))}
          <Label
            content={({ viewBox }) => {
              if (!viewBox || !("cx" in viewBox)) return null;
              return (
                <text x={viewBox.cx} y={viewBox.cy} textAnchor="middle" dominantBaseline="middle">
                  <tspan x={viewBox.cx} y={(viewBox.cy ?? 0) - 6} className="money fill-foreground font-mono text-xl font-semibold">
                    {moneyShort(total)}
                  </tspan>
                  <tspan x={viewBox.cx} y={(viewBox.cy ?? 0) + 16} className="fill-muted-foreground text-xs">
                    gastos no mês
                  </tspan>
                </text>
              );
            }}
          />
        </Pie>
      </PieChart>
    </ChartContainer>
  );
}

const balanceConfig = { saldo: { label: "Saldo do mês", color: "var(--chart-1)" } } satisfies ChartConfig;

export function BalanceChart({ data }: { data: { dia: number; saldo: number }[] }) {
  const negative = data.some((d) => d.saldo < 0);
  return (
    <ChartContainer config={balanceConfig} className="aspect-auto h-[220px] w-full">
      <AreaChart data={data} margin={{ left: 4, right: 12, top: 8 }}>
        <defs>
          <linearGradient id="fill-saldo" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="var(--color-saldo)" stopOpacity={0.35} />
            <stop offset="95%" stopColor="var(--color-saldo)" stopOpacity={0.02} />
          </linearGradient>
        </defs>
        <CartesianGrid vertical={false} strokeDasharray="3 6" />
        <XAxis dataKey="dia" tickLine={false} axisLine={false} tickMargin={8} interval="preserveStartEnd" tickFormatter={(d: number) => `dia ${d}`} />
        <YAxis tickLine={false} axisLine={false} width={52} tickFormatter={(v: number) => axisLabel(v)} className="money" />
        {negative && <ReferenceLine y={0} stroke="var(--destructive)" strokeDasharray="4 4" />}
        <ChartTooltip cursor={false} content={<ChartTooltipContent indicator="line" labelFormatter={(_, p) => `Dia ${p?.[0]?.payload?.dia}`} formatter={moneyRow(balanceConfig)} />} />
        <Area dataKey="saldo" type="stepAfter" fill="url(#fill-saldo)" stroke="var(--color-saldo)" strokeWidth={2} />
      </AreaChart>
    </ChartContainer>
  );
}

const merchantConfig = { value: { label: "Gasto", color: "var(--chart-2)" } } satisfies ChartConfig;

export function MerchantsChart({ data }: { data: { name: string; value: number; count: number }[] }) {
  return (
    <ChartContainer config={merchantConfig} className="aspect-auto h-[240px] w-full">
      <BarChart data={data} layout="vertical" margin={{ left: 0, right: 48 }}>
        <XAxis type="number" hide />
        <YAxis type="category" dataKey="name" tickLine={false} axisLine={false} width={96} tickMargin={6} />
        <ChartTooltip
          cursor={false}
          content={<ChartTooltipContent hideLabel formatter={(v, _n, item) => moneyRow(merchantConfig)(v, `${item.payload.name} · ${item.payload.count}x`, item)} />}
        />
        <Bar dataKey="value" fill="var(--color-value)" radius={6} label={{ position: "right", className: "money fill-muted-foreground text-[11px]", formatter: (v: unknown) => moneyShort(Number(v)) }} />
      </BarChart>
    </ChartContainer>
  );
}
