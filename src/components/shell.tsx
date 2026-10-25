"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { ArrowLeftRight, Eye, EyeOff, LayoutDashboard, PiggyBank, ShieldCheck, Tags, Target, Upload } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import { useMoney } from "@/lib/store";

const NAV = [
  { href: "/", label: "Painel", icon: LayoutDashboard },
  { href: "/transacoes", label: "Transações", icon: ArrowLeftRight },
  { href: "/importar", label: "Importar", icon: Upload },
  { href: "/metas", label: "Metas", icon: Target },
  { href: "/regras", label: "Regras", icon: Tags },
];

export function Logo() {
  return (
    <Link href="/" className="flex items-center gap-2.5">
      <span className="flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-[0_0_24px_-4px] shadow-primary/60">
        <PiggyBank className="size-5" />
      </span>
      <span className="text-lg font-semibold tracking-tight">Cofrinho</span>
    </Link>
  );
}

function PrivacyButton() {
  const privacy = useMoney((s) => s.privacy);
  const toggle = useMoney((s) => s.togglePrivacy);
  return (
    <button
      type="button"
      onClick={toggle}
      aria-pressed={privacy}
      aria-label={privacy ? "Mostrar valores" : "Esconder valores"}
      className="flex size-9 items-center justify-center rounded-lg border border-border text-muted-foreground transition hover:text-foreground"
    >
      {privacy ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
    </button>
  );
}

export function Shell({ children }: { children: ReactNode }) {
  const path = usePathname();
  const privacy = useMoney((s) => s.privacy);
  const toggle = useMoney((s) => s.togglePrivacy);
  const active = (href: string) => (href === "/" ? path === "/" : path.startsWith(href));

  return (
    <div className={cn("lg:grid lg:min-h-screen lg:grid-cols-[15rem_minmax(0,1fr)]", privacy && "privacy")}>
      <aside className="sticky top-0 hidden h-screen flex-col gap-8 border-r border-sidebar-border bg-sidebar/70 p-4 lg:flex">
        <div className="px-2 pt-2">
          <Logo />
        </div>
        <nav className="flex flex-col gap-1">
          {NAV.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors",
                active(href) ? "bg-sidebar-accent font-medium text-foreground" : "text-muted-foreground hover:bg-sidebar-accent/60 hover:text-foreground",
              )}
            >
              <Icon className={cn("size-4", active(href) && "text-primary")} />
              {label}
            </Link>
          ))}
        </nav>
        <div className="mt-auto space-y-3">
          <label className="flex cursor-pointer items-center justify-between rounded-lg border border-sidebar-border px-3 py-2.5 text-sm">
            <span className="flex items-center gap-2 text-muted-foreground">
              {privacy ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
              Modo privacidade
            </span>
            <Switch checked={privacy} onCheckedChange={toggle} />
          </label>
          <div className="flex items-start gap-2 rounded-lg bg-primary/10 p-3 text-xs text-muted-foreground">
            <ShieldCheck className="mt-0.5 size-4 shrink-0 text-primary" />
            <span>Seu extrato é lido aqui no navegador e nunca sai do seu computador.</span>
          </div>
        </div>
      </aside>

      <div className="min-w-0">
        <header className="sticky top-0 z-30 flex items-center justify-between border-b border-border bg-background/85 px-4 pb-3 pt-[calc(0.75rem+env(safe-area-inset-top))] backdrop-blur-md lg:hidden">
          <Logo />
          <PrivacyButton />
        </header>
        <main className="mx-auto w-full max-w-7xl px-4 pb-28 pt-6 sm:px-6 lg:px-8 lg:pb-12 lg:pt-8">{children}</main>
      </div>

      <nav className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-5 border-t border-border bg-background/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-md lg:hidden">
        {NAV.map(({ href, label, icon: Icon }) => (
          <Link key={href} href={href} className="flex flex-col items-center gap-1 py-2.5">
            <Icon className={cn("size-5", active(href) ? "text-primary" : "text-muted-foreground")} />
            <span className={cn("text-[10px]", active(href) ? "text-foreground" : "text-muted-foreground")}>{label}</span>
          </Link>
        ))}
      </nav>
    </div>
  );
}
