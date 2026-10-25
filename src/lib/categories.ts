import type { Category, Rule } from "./types";

export const DEFAULT_CATEGORIES: Category[] = [
  { id: "mercado", name: "Mercado", kind: "expense", color: "#4ade80", icon: "ShoppingCart", budget: 900 },
  { id: "delivery", name: "Delivery", kind: "expense", color: "#f87171", icon: "Bike", budget: 300 },
  { id: "restaurantes", name: "Restaurantes", kind: "expense", color: "#fb923c", icon: "UtensilsCrossed", budget: 250 },
  { id: "moradia", name: "Moradia", kind: "expense", color: "#60a5fa", icon: "House" },
  { id: "transporte", name: "Transporte", kind: "expense", color: "#facc15", icon: "Car", budget: 250 },
  { id: "combustivel", name: "Combustível", kind: "expense", color: "#eab308", icon: "Fuel", budget: 300 },
  { id: "assinaturas", name: "Assinaturas", kind: "expense", color: "#c084fc", icon: "Tv", budget: 120 },
  { id: "saude", name: "Saúde", kind: "expense", color: "#2dd4bf", icon: "HeartPulse" },
  { id: "academia", name: "Academia", kind: "expense", color: "#f472b6", icon: "Dumbbell" },
  { id: "lazer", name: "Lazer", kind: "expense", color: "#a78bfa", icon: "Gamepad2", budget: 200 },
  { id: "compras", name: "Compras", kind: "expense", color: "#38bdf8", icon: "ShoppingBag", budget: 300 },
  { id: "educacao", name: "Educação", kind: "expense", color: "#818cf8", icon: "GraduationCap" },
  { id: "tarifas", name: "Impostos e tarifas", kind: "expense", color: "#94a3b8", icon: "Landmark" },
  { id: "outros", name: "Outros gastos", kind: "expense", color: "#a3a3a3", icon: "CircleDashed" },
  { id: "salario", name: "Salário", kind: "income", color: "#34d399", icon: "Wallet" },
  { id: "pix-recebido", name: "Pix recebido", kind: "income", color: "#5eead4", icon: "ArrowDownLeft" },
  { id: "rendimentos", name: "Rendimentos", kind: "income", color: "#a3e635", icon: "TrendingUp" },
  { id: "outras-entradas", name: "Outras entradas", kind: "income", color: "#86efac", icon: "Plus" },
  { id: "investimentos", name: "Investimentos", kind: "transfer", color: "#22d3ee", icon: "PiggyBank" },
  { id: "transferencias", name: "Transferências e fatura", kind: "transfer", color: "#78716c", icon: "ArrowLeftRight" },
];

// Palavras que aparecem nos extratos dos bancos brasileiros. A ordem importa: a primeira que bater vence.
const RULE_WORDS: [string, string[]][] = [
  ["transferencias", ["pagamento de fatura", "pagto fatura", "pag fatura", "transferencia entre contas", "transf mesma titularidade"]],
  ["investimentos", ["aplicacao", "resgate", "cdb", "tesouro direto", "lci", "lca", "invest"]],
  ["salario", ["salario", "folha de pagamento", "proventos", "credito de salario"]],
  ["rendimentos", ["rendimento", "juros poupanca", "dividendo", "remuneracao"]],
  ["pix-recebido", ["pix recebido", "transferencia recebida", "ted recebida", "pix de"]],
  ["compras", ["mercado livre", "mercadolivre", "mercadopago"]],
  ["delivery", ["ifood", "rappi", "ze delivery", "zedelivery", "james delivery", "aiqfome"]],
  ["mercado", ["supermercado", "mercado", "savegnago", "carrefour", "pao de acucar", "assai", "atacadao", "tonin", "sams club", "hortifruti"]],
  ["restaurantes", ["restaurante", "lanchonete", "padaria", "burger", "mcdonald", "mc donalds", "outback", "starbucks", "pizzaria", "churrascaria", "sushi"]],
  ["transporte", ["uber", "99app", "99 pop", "99pop", "cabify", "estacionamento", "sem parar", "veloe", "pedagio", "onibus", "metro"]],
  ["combustivel", ["posto", "shell", "ipiranga", "petrobras", "br mania", "combustivel"]],
  ["moradia", ["aluguel", "condominio", "cpfl", "energia", "daerp", "saerp", "sabesp", "agua e esgoto", "vivo fibra", "claro net", "internet", "comgas", "ultragaz"]],
  ["assinaturas", ["netflix", "spotify", "disney", "prime video", "amazon prime", "youtube", "hbo", "max.com", "apple.com", "google one", "openai", "chatgpt", "deezer", "globoplay"]],
  ["academia", ["smart fit", "smartfit", "bluefit", "academia", "growth supplements", "integralmedica", "max titanium", "suplemento"]],
  ["saude", ["farmacia", "drogasil", "droga raia", "drogaria", "pague menos", "unimed", "hospital", "laboratorio", "dentista", "clinica"]],
  ["lazer", ["cinema", "cinemark", "ingresso", "sympla", "steam", "playstation", "xbox", "nintendo", "show"]],
  ["compras", ["amazon", "shopee", "magalu", "magazine luiza", "americanas", "shein", "aliexpress", "renner", "riachuelo", "centauro", "kabum"]],
  ["educacao", ["curso", "udemy", "alura", "descomplica", "faculdade", "livraria", "rocketseat"]],
  ["tarifas", ["tarifa", "iof", "juros", "anuidade", "multa", "ipva", "iptu", "cesta de servicos"]],
];

export const DEFAULT_RULES: Rule[] = RULE_WORDS.flatMap(([categoryId, words]) =>
  words.map((match) => ({ id: `padrao-${categoryId}-${match.replace(/\W+/g, "-")}`, match, categoryId })),
);

// Sem acento, minúsculo e sem pontuação extra: "IFOOD *Restaurante" e "ifood restaurante" viram a mesma coisa.
export function normalize(s: string) {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[*_/\\|]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

// A primeira regra que bater vence, desde que combine com o sinal: regra de entrada não pega saída e vice-versa.
export function categorize(description: string, amount: number, rules: Rule[], kindOf: (categoryId: string) => Category["kind"] | undefined) {
  const text = normalize(description);
  const hit = rules.find((r) => {
    if (!r.match || !text.includes(normalize(r.match))) return false;
    const kind = kindOf(r.categoryId);
    return kind === "transfer" || (amount >= 0 ? kind === "income" : kind === "expense");
  });
  if (hit) return hit.categoryId;
  return amount >= 0 ? "outras-entradas" : "outros";
}

// Nome do estabelecimento sem os códigos do banco, para agrupar "IFOOD *XPTO 123" com "IFOOD *ABC".
export function merchantOf(description: string) {
  const clean = normalize(description)
    .replace(/^(compra|pagamento|pix enviado|pix|debito|credito|pgto|pag|transferencia enviada)( (com cartao|no debito|para|de))?\s+/, "")
    .replace(/\b\d[\d.,-]*\b/g, "")
    .replace(/\s+/g, " ")
    .trim();
  const first = clean.split(" ").slice(0, 2).join(" ");
  return first ? first.replace(/\b\w/g, (c) => c.toUpperCase()) : "Sem nome";
}
