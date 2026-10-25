import { describe, expect, it } from "vitest";
import { categorize, DEFAULT_CATEGORIES, DEFAULT_RULES, merchantOf } from "./categories";
import { parseCsv, parseDate, parseMoney, parseOfx, txKey } from "./parse";

const kindOf = (id: string) => DEFAULT_CATEGORIES.find((c) => c.id === id)?.kind;
const cat = (description: string, amount: number) => categorize(description, amount, DEFAULT_RULES, kindOf);

describe("parseMoney", () => {
  it.each([
    ["R$ -1.234,56", -1234.56],
    ["1,234.56", 1234.56],
    ["(45,90)", -45.9],
    ["-45.9", -45.9],
    ["45,90 D", -45.9],
    ["1.500", 1500],
    ["1500.00", 1500],
    ["0,99", 0.99],
  ])("lê %s", (raw, want) => expect(parseMoney(raw)).toBe(want));

  it("devolve null para texto vazio ou inválido", () => {
    expect(parseMoney("")).toBeNull();
    expect(parseMoney("abc")).toBeNull();
  });
});

describe("parseDate", () => {
  it.each([
    ["05/10/2026", "2026-10-05"],
    ["5/1/26", "2026-01-05"],
    ["05-10-2026", "2026-10-05"],
    ["2026-10-05", "2026-10-05"],
    ["20261005120000[-3:BRT]", "2026-10-05"],
  ])("lê %s", (raw, want) => expect(parseDate(raw)).toBe(want));
});

describe("parseCsv", () => {
  it("acha o cabeçalho depois das linhas de identificação do banco e respeita aspas", () => {
    const csv = 'Extrato conta corrente\nAgência 1234\n\nData;Histórico;Valor\n01/10/2026;"PIX ENVIADO; ALUGUEL";-1.250,00\n05/10/2026;CREDITO DE SALARIO;4.850,00\n';
    const r = parseCsv(csv);
    expect(r.rows).toHaveLength(2);
    expect(r.rows[0]).toEqual({ date: "2026-10-01", description: "PIX ENVIADO; ALUGUEL", amount: -1250 });
  });

  it("reconhece fatura de cartão, que lista gastos como positivos", () => {
    const r = parseCsv("date,category,title,amount\n2026-10-03,restaurante,Ifood *Burger,45.90\n");
    expect(r.looksLikeCard).toBe(true);
    expect(r.rows[0].amount).toBe(45.9);
  });

  it("junta colunas separadas de entrada e saída", () => {
    const r = parseCsv("Data;Descrição;Entrada;Saída\n10/10/2026;Rendimento poupança;12,34;\n11/10/2026;Farmácia;;56,70\n");
    expect(r.rows.map((x) => x.amount)).toEqual([12.34, -56.7]);
  });

  it("avisa quando não reconhece as colunas", () => {
    expect(parseCsv("a;b;c\n1;2;3").rows).toHaveLength(0);
  });
});

describe("parseOfx", () => {
  it("lê OFX em SGML e com várias tags na mesma linha", () => {
    const ofx =
      "OFXHEADER:100\n<OFX><BANKTRANLIST>\n<STMTTRN>\n<TRNTYPE>DEBIT\n<DTPOSTED>20261003120000[-3:BRT]\n<TRNAMT>-45.90\n<FITID>123\n<MEMO>IFOOD *BURGER\n</STMTTRN>\n<STMTTRN><TRNTYPE>CREDIT<DTPOSTED>20261005<TRNAMT>4850.00<FITID>124<NAME>SALARIO</STMTTRN>\n</BANKTRANLIST></OFX>";
    const rows = parseOfx(ofx);
    expect(rows).toHaveLength(2);
    expect(rows[0]).toMatchObject({ date: "2026-10-03", amount: -45.9, fitId: "123" });
    expect(rows[1].description).toBe("SALARIO");
  });

  it("usa o FITID como chave para não duplicar", () => {
    expect(txKey({ date: "2026-10-03", amount: -45.9, description: "x", fitId: "123" })).toBe("fit:123");
  });
});

describe("categorize", () => {
  it.each([
    ["MERCADO LIVRE *COMPRA", -120, "compras"],
    ["SAVEGNAGO SUPERMERCADOS", -200, "mercado"],
    ["IFOOD *RESTAURANTE", -50, "delivery"],
    ["AMAZON PRIME VIDEO", -19.9, "assinaturas"],
    ["SMART FIT RIBEIRAO", -119.9, "academia"],
    ["PIX RECEBIDO MARIA", 200, "pix-recebido"],
    ["PAGAMENTO DE FATURA CARTAO", -500, "transferencias"],
    ["GASTOS DIVERSOS", -10, "outros"],
    ["ESTORNO IFOOD", 50, "outras-entradas"],
  ])("%s → %s", (description, amount, want) => expect(cat(description, amount)).toBe(want));

  it("as regras da pessoa vêm antes das padrão", () => {
    const rules = [{ id: "minha", match: "ifood", categoryId: "restaurantes" }, ...DEFAULT_RULES];
    expect(categorize("IFOOD *BURGER", -40, rules, kindOf)).toBe("restaurantes");
  });
});

describe("merchantOf", () => {
  it("tira códigos e agrupa pelo nome", () => {
    expect(merchantOf("IFOOD *BURGER 123")).toBe("Ifood Burger");
    expect(merchantOf("COMPRA NO DEBITO SAVEGNAGO 4421")).toBe("Savegnago");
  });
});
