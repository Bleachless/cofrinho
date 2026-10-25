"use client";

import { useSyncExternalStore } from "react";
import { create } from "zustand";
import { persist } from "zustand/middleware";
import { categorize, DEFAULT_CATEGORIES, DEFAULT_RULES } from "./categories";
import { txKey } from "./parse";
import { demoTransactions } from "./seed";
import type { Category, ParsedTx, Rule, Tx } from "./types";

const uid = () => (typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : Math.random().toString(36).slice(2));

type State = {
  txs: Tx[];
  categories: Category[];
  rules: Rule[]; // regras da pessoa; as padrão vêm depois delas
  keys: string[]; // o que já foi importado, para não duplicar
  privacy: boolean;
  savingsGoal: number; // % da renda que quer guardar por mês

  importRows: (rows: ParsedTx[], source: Tx["source"]) => { added: number; duplicated: number };
  setCategory: (txId: string, categoryId: string) => void;
  addRule: (match: string, categoryId: string) => number;
  removeRule: (id: string) => void;
  reapplyRules: () => number;
  setBudget: (categoryId: string, budget: number | undefined) => void;
  setSavingsGoal: (pct: number) => void;
  togglePrivacy: () => void;
  deleteTx: (id: string) => void;
  loadDemo: () => void;
  clearAll: () => void;
};

export const useMoney = create<State>()(
  persist(
    (set, get) => {
      const kindOf = (id: string) => get().categories.find((c) => c.id === id)?.kind;
      const allRules = () => [...get().rules, ...DEFAULT_RULES];

      return {
        txs: [],
        categories: DEFAULT_CATEGORIES,
        rules: [],
        keys: [],
        privacy: false,
        savingsGoal: 0.2,

        importRows: (rows, source) => {
          const seen = new Set(get().keys);
          const fresh: Tx[] = [];
          let duplicated = 0;
          for (const r of rows) {
            const key = txKey(r);
            if (seen.has(key)) {
              duplicated++;
              continue;
            }
            seen.add(key);
            fresh.push({
              id: uid(),
              date: r.date,
              description: r.description,
              amount: r.amount,
              source,
              categoryId: categorize(r.description, r.amount, allRules(), kindOf),
            });
          }
          set((s) => ({ txs: [...s.txs, ...fresh].sort((a, b) => b.date.localeCompare(a.date)), keys: [...seen] }));
          return { added: fresh.length, duplicated };
        },
        setCategory: (txId, categoryId) =>
          set((s) => ({ txs: s.txs.map((t) => (t.id === txId ? { ...t, categoryId, manual: true } : t)) })),
        addRule: (match, categoryId) => {
          set((s) => ({ rules: [{ id: uid(), match: match.trim(), categoryId }, ...s.rules] }));
          return get().reapplyRules();
        },
        removeRule: (id) => set((s) => ({ rules: s.rules.filter((r) => r.id !== id) })),
        // Recategoriza tudo que não foi escolhido à mão. Devolve quantas mudaram.
        reapplyRules: () => {
          let changed = 0;
          const rules = allRules();
          set((s) => ({
            txs: s.txs.map((t) => {
              if (t.manual) return t;
              const categoryId = categorize(t.description, t.amount, rules, kindOf);
              if (categoryId !== t.categoryId) changed++;
              return { ...t, categoryId };
            }),
          }));
          return changed;
        },
        setBudget: (categoryId, budget) =>
          set((s) => ({ categories: s.categories.map((c) => (c.id === categoryId ? { ...c, budget } : c)) })),
        setSavingsGoal: (pct) => set({ savingsGoal: pct }),
        togglePrivacy: () => set((s) => ({ privacy: !s.privacy })),
        deleteTx: (id) => set((s) => ({ txs: s.txs.filter((t) => t.id !== id) })),
        loadDemo: () => {
          set({ txs: [], keys: [] });
          get().importRows(demoTransactions(), "demo");
        },
        clearAll: () => set({ txs: [], keys: [], rules: [], categories: DEFAULT_CATEGORIES }),
      };
    },
    {
      name: "cofrinho",
      version: 1,
      partialize: (s) => ({
        txs: s.txs,
        categories: s.categories,
        rules: s.rules,
        keys: s.keys,
        privacy: s.privacy,
        savingsGoal: s.savingsGoal,
      }),
    },
  ),
);

// Os dados moram no navegador: até carregarem, as telas mostram um esqueleto.
export function useHydrated() {
  return useSyncExternalStore(
    (cb) => useMoney.persist.onFinishHydration(cb),
    () => useMoney.persist.hasHydrated(),
    () => false,
  );
}
