import { normalize } from "./categories";
import type { ParsedTx } from "./types";

// ---------- Texto do arquivo ----------

// Bancos brasileiros ainda exportam muito em Windows-1252. Tenta UTF-8 e, se aparecer caractere quebrado, troca.
export async function readText(file: File) {
  const buf = await file.arrayBuffer();
  const utf8 = new TextDecoder("utf-8").decode(buf);
  if (!utf8.includes("�")) return utf8;
  return new TextDecoder("windows-1252").decode(buf);
}

// ---------- Números e datas ----------

// Aceita "R$ -1.234,56", "1,234.56", "(45,90)", "-45.9" e "45,90 D".
export function parseMoney(raw: string): number | null {
  let s = raw.trim();
  if (!s) return null;
  let negative = false;
  if (/^\(.*\)$/.test(s)) {
    negative = true;
    s = s.slice(1, -1);
  }
  if (/\bD$/i.test(s)) negative = true;
  s = s.replace(/R\$|\s|[CD]$/gi, "");
  if (s.startsWith("-")) {
    negative = !negative;
    s = s.slice(1);
  }
  if (s.endsWith("-")) {
    negative = !negative;
    s = s.slice(0, -1);
  }
  const lastComma = s.lastIndexOf(",");
  const lastDot = s.lastIndexOf(".");
  if (lastComma > -1 && lastDot > -1) {
    s = lastComma > lastDot ? s.replace(/\./g, "").replace(",", ".") : s.replace(/,/g, "");
  } else if (lastComma > -1) {
    s = s.replace(/\./g, "").replace(",", ".");
  } else if (/^\d{1,3}(\.\d{3})+$/.test(s)) {
    s = s.replace(/\./g, "");
  }
  const n = Number(s);
  if (!Number.isFinite(n)) return null;
  return Math.round((negative ? -n : n) * 100) / 100;
}

// Aceita dd/mm/aaaa, dd/mm/aa, dd-mm-aaaa, aaaa-mm-dd e aaaammdd (OFX).
export function parseDate(raw: string): string | null {
  const s = raw.trim();
  let m = s.match(/^(\d{4})-?(\d{2})-?(\d{2})/);
  if (m) return `${m[1]}-${m[2]}-${m[3]}`;
  m = s.match(/^(\d{1,2})[/.-](\d{1,2})[/.-](\d{2,4})/);
  if (m) {
    const year = m[3].length === 2 ? `20${m[3]}` : m[3];
    return `${year}-${m[2].padStart(2, "0")}-${m[1].padStart(2, "0")}`;
  }
  return null;
}

// ---------- OFX ----------

function tag(block: string, name: string) {
  const m = block.match(new RegExp(`<${name}>([^<\\r\\n]*)`, "i"));
  return m ? m[1].trim() : "";
}

export function parseOfx(text: string): ParsedTx[] {
  const blocks = text.match(/<STMTTRN>[\s\S]*?(?=<\/STMTTRN>|<STMTTRN>|<\/BANKTRANLIST>)/gi) ?? [];
  const out: ParsedTx[] = [];
  for (const b of blocks) {
    const date = parseDate(tag(b, "DTPOSTED"));
    const amount = parseMoney(tag(b, "TRNAMT").replace(",", "."));
    const description = tag(b, "MEMO") || tag(b, "NAME") || "Sem descrição";
    if (!date || amount === null) continue;
    out.push({ date, amount, description, fitId: tag(b, "FITID") || undefined });
  }
  return out;
}

// ---------- CSV ----------

function splitLine(line: string, sep: string) {
  const cells: string[] = [];
  let cur = "";
  let quoted = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (c === '"') {
      if (quoted && line[i + 1] === '"') {
        cur += '"';
        i++;
      } else quoted = !quoted;
    } else if (c === sep && !quoted) {
      cells.push(cur.trim());
      cur = "";
    } else cur += c;
  }
  cells.push(cur.trim());
  return cells;
}

const DATE_COLS = ["data", "date", "data lancamento", "data do lancamento", "dt lancamento", "data movimento"];
const DESC_COLS = ["descricao", "historico", "lancamento", "title", "description", "estabelecimento", "detalhe", "memo"];
const AMOUNT_COLS = ["valor", "amount", "valor (r$)", "valor r$", "quantia", "montante"];
const CREDIT_COLS = ["entrada", "credito", "creditos", "entradas"];
const DEBIT_COLS = ["saida", "debito", "debitos", "saidas"];

const findCol = (header: string[], names: string[]) => header.findIndex((h) => names.includes(h));

export type CsvResult = { rows: ParsedTx[]; format: string; looksLikeCard: boolean; skipped: number };

export function parseCsv(text: string): CsvResult {
  const lines = text.replace(/^﻿/, "").split(/\r?\n/).filter((l) => l.trim());
  if (lines.length === 0) return { rows: [], format: "CSV vazio", looksLikeCard: false, skipped: 0 };

  // O separador é o que mais aparece nas primeiras linhas.
  const sample = lines.slice(0, 5).join("\n");
  const sep = [";", ",", "\t"].sort((a, b) => sample.split(b).length - sample.split(a).length)[0];

  // Alguns bancos colocam linhas de cabeçalho antes da tabela: procura a linha com os nomes das colunas.
  let headerAt = -1;
  let header: string[] = [];
  for (let i = 0; i < Math.min(lines.length, 15); i++) {
    const cells = splitLine(lines[i], sep).map((c) => normalize(c).replace(/"/g, ""));
    if (findCol(cells, DATE_COLS) > -1 && (findCol(cells, AMOUNT_COLS) > -1 || findCol(cells, CREDIT_COLS) > -1)) {
      headerAt = i;
      header = cells;
      break;
    }
  }
  if (headerAt < 0) return { rows: [], format: "Não reconheci as colunas", looksLikeCard: false, skipped: lines.length };

  const iDate = findCol(header, DATE_COLS);
  const iDesc = findCol(header, DESC_COLS);
  const iAmount = findCol(header, AMOUNT_COLS);
  const iCredit = findCol(header, CREDIT_COLS);
  const iDebit = findCol(header, DEBIT_COLS);
  // Fatura de cartão (ex.: Nubank "date,title,amount") lista gastos como valores positivos.
  const looksLikeCard = header.includes("title") && header.includes("amount");

  const rows: ParsedTx[] = [];
  let skipped = 0;
  for (const line of lines.slice(headerAt + 1)) {
    const c = splitLine(line, sep);
    const date = parseDate(c[iDate] ?? "");
    let amount: number | null = null;
    if (iAmount > -1) amount = parseMoney(c[iAmount] ?? "");
    else {
      const credit = parseMoney(c[iCredit] ?? "") ?? 0;
      const debit = iDebit > -1 ? (parseMoney(c[iDebit] ?? "") ?? 0) : 0;
      amount = Math.round((Math.abs(credit) - Math.abs(debit)) * 100) / 100;
    }
    const description = (iDesc > -1 ? c[iDesc] : c.find((x, k) => k !== iDate && k !== iAmount && x)) || "Sem descrição";
    if (!date || amount === null || amount === 0) {
      skipped++;
      continue;
    }
    rows.push({ date, amount, description: description.replace(/^"|"$/g, "") });
  }
  const sepName = sep === ";" ? "ponto e vírgula" : sep === "," ? "vírgula" : "tab";
  return { rows, format: `CSV separado por ${sepName}`, looksLikeCard, skipped };
}

export async function parseFile(file: File) {
  const text = await readText(file);
  const isOfx = /\.ofx$|\.qfx$/i.test(file.name) || /<OFX>|OFXHEADER/i.test(text.slice(0, 2000));
  if (isOfx) {
    const rows = parseOfx(text);
    return { rows, format: "OFX (extrato bancário)", looksLikeCard: false, skipped: 0 } satisfies CsvResult;
  }
  return parseCsv(text);
}

// Chave para não importar a mesma transação duas vezes.
export const txKey = (t: { date: string; amount: number; description: string; fitId?: string }) =>
  t.fitId ? `fit:${t.fitId}` : `${t.date}|${t.amount.toFixed(2)}|${normalize(t.description)}`;
