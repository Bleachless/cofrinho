// "expense" e "income" entram nas contas; "transfer" (aplicação, fatura, entre contas) fica de fora
// para não contar o mesmo dinheiro duas vezes.
export type Kind = "expense" | "income" | "transfer";

export type Category = {
  id: string;
  name: string;
  kind: Kind;
  color: string;
  icon: string;
  budget?: number;
};

export type Rule = { id: string; match: string; categoryId: string };

export type Tx = {
  id: string;
  date: string; // aaaa-mm-dd
  description: string;
  amount: number; // negativo = saída
  categoryId: string;
  source: "ofx" | "csv" | "demo" | "manual";
  manual?: boolean; // categoria escolhida à mão: regras não sobrescrevem
};

export type ParsedTx = { date: string; description: string; amount: number; fitId?: string };
