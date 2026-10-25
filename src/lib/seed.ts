import type { ParsedTx } from "./types";

// Gerador pseudoaleatório com semente: o exemplo sai igual toda vez.
function rng(seed: number) {
  return () => {
    seed = (seed * 1664525 + 1013904223) % 4294967296;
    return seed / 4294967296;
  };
}

const iso = (y: number, m: number, d: number) => `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;

// Seis meses de extrato fictício de alguém em Ribeirão Preto.
export function demoTransactions(now = new Date()): ParsedTx[] {
  const r = rng(42);
  const out: ParsedTx[] = [];
  const between = (a: number, b: number) => Math.round((a + r() * (b - a)) * 100) / 100;
  const pick = <T,>(list: T[]) => list[Math.floor(r() * list.length)];

  for (let back = 5; back >= 0; back--) {
    const ref = new Date(now.getFullYear(), now.getMonth() - back, 1);
    const y = ref.getFullYear();
    const m = ref.getMonth() + 1;
    const days = new Date(y, m, 0).getDate();
    const lastDay = back === 0 ? Math.min(days, now.getDate()) : days;
    const add = (d: number, description: string, amount: number) => {
      if (d <= lastDay) out.push({ date: iso(y, m, Math.min(d, days)), description, amount });
    };

    add(5, "CREDITO DE SALARIO EMPRESA LTDA", 4850);
    add(6, "APLICACAO CDB LIQUIDEZ DIARIA", -between(500, 900));
    add(8, "PIX ENVIADO ALUGUEL JOSE CARLOS", -1250);
    add(10, "CONDOMINIO RESIDENCIAL IPES", -380);
    add(12, "CPFL PAULISTA ENERGIA", -between(140, 210));
    add(14, "DAERP AGUA E ESGOTO", -between(55, 80));
    add(15, "VIVO FIBRA INTERNET", -109.99);
    add(3, "SMART FIT RIBEIRAO PRETO", -119.9);
    add(7, "NETFLIX.COM", -44.9);
    add(9, "SPOTIFY BRASIL", -21.9);
    add(20, "OPENAI CHATGPT", -110);
    add(28, "RENDIMENTO POUPANCA", between(8, 25));
    add(25, "PAGAMENTO DE FATURA CARTAO", -between(300, 600));

    for (let d = 2; d <= days; d += 7 + Math.floor(r() * 2)) add(d, pick(["SAVEGNAGO SUPERMERCADOS", "SUPERMERCADO TONIN", "CARREFOUR RIBEIRAO"]), -between(120, 280));
    for (let i = 0; i < 6 + Math.floor(r() * 4); i++)
      add(1 + Math.floor(r() * days), pick(["IFOOD *RESTAURANTE", "IFOOD *BURGER", "RAPPI *PIZZA", "IFOOD *SUSHI"]), -between(32, 95));
    for (let i = 0; i < 3 + Math.floor(r() * 3); i++)
      add(1 + Math.floor(r() * days), pick(["PADARIA PAO NOSSO", "RESTAURANTE BOM PRATO", "STARBUCKS IGUATEMI", "OUTBACK RIBEIRAO"]), -between(18, 140));
    for (let i = 0; i < 5 + Math.floor(r() * 5); i++) add(1 + Math.floor(r() * days), pick(["UBER *TRIP", "99APP *CORRIDA"]), -between(12, 38));
    for (let i = 0; i < 2; i++) add(4 + i * 13, pick(["POSTO SHELL JD IRAJA", "POSTO IPIRANGA"]), -between(150, 230));
    if (r() > 0.3) add(1 + Math.floor(r() * days), pick(["DROGASIL", "DROGA RAIA"]), -between(25, 90));
    if (r() > 0.4) add(1 + Math.floor(r() * days), pick(["AMAZON MARKETPLACE", "SHOPEE", "MERCADO LIVRE"]), -between(60, 320));
    if (r() > 0.5) add(1 + Math.floor(r() * days), pick(["CINEMARK IGUATEMI", "STEAM GAMES", "SYMPLA INGRESSOS"]), -between(30, 120));
    if (r() > 0.6) add(1 + Math.floor(r() * days), "GROWTH SUPPLEMENTS WHEY", -between(130, 190));
    if (r() > 0.55) add(1 + Math.floor(r() * days), pick(["PIX RECEBIDO MARIA SOUZA", "PIX RECEBIDO PEDRO LIMA"]), between(50, 400));
    if (m === 1) add(20, "IPVA 2026 PARCELA", -380);
    add(28, "TARIFA CESTA DE SERVICOS", -19.9);
  }
  return out.sort((a, b) => a.date.localeCompare(b.date));
}

// Arquivos de exemplo para testar a importação.
export function sampleCsv(rows: ParsedTx[]) {
  const head = "Data;Descrição;Valor";
  const body = rows.slice(-25).map((t) => {
    const [y, m, d] = t.date.split("-");
    return `${d}/${m}/${y};${t.description};${t.amount.toFixed(2).replace(".", ",")}`;
  });
  return [head, ...body].join("\n");
}

export function sampleOfx(rows: ParsedTx[]) {
  const items = rows
    .slice(-25)
    .map(
      (t, i) =>
        `<STMTTRN>\n<TRNTYPE>${t.amount < 0 ? "DEBIT" : "CREDIT"}\n<DTPOSTED>${t.date.replace(/-/g, "")}120000[-3:BRT]\n<TRNAMT>${t.amount.toFixed(2)}\n<FITID>EXEMPLO${i}\n<MEMO>${t.description}\n</STMTTRN>`,
    )
    .join("\n");
  return `OFXHEADER:100\nDATA:OFXSGML\nVERSION:102\nCHARSET:1252\n\n<OFX>\n<BANKMSGSRSV1><STMTTRNRS><STMTRS>\n<CURDEF>BRL\n<BANKTRANLIST>\n${items}\n</BANKTRANLIST>\n</STMTRS></STMTTRNRS></BANKMSGSRSV1>\n</OFX>\n`;
}
