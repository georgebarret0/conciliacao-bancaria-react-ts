import Papa from "papaparse";
import type { ParseResult } from "papaparse";
import type { BankTransaction, InternalEntry, TransactionDirection } from "../types";

type CsvRow = Record<string, string>;

export function parseBankCsv(file: File): Promise<BankTransaction[]> {
  return parseCsv(file, (row, index) => ({
    id: row.id || `bank-import-${index + 1}`,
    date: row.date,
    description: row.description,
    document: row.document,
    amount: Number(row.amount),
    account: row.account || "Importado",
    direction: parseDirection(row.direction, Number(row.amount)),
  }));
}

export function parseInternalCsv(file: File): Promise<InternalEntry[]> {
  return parseCsv(file, (row, index) => ({
    id: row.id || `entry-import-${index + 1}`,
    expectedDate: row.expectedDate || row.expected_date || row.date,
    description: row.description,
    document: row.document,
    amount: Number(row.amount),
    costCenter: row.costCenter || row.cost_center || "Importado",
    direction: parseDirection(row.direction, Number(row.amount)),
  }));
}

function parseCsv<T>(file: File, mapper: (row: CsvRow, index: number) => T): Promise<T[]> {
  return new Promise((resolve, reject) => {
    Papa.parse<CsvRow>(file, {
      header: true,
      skipEmptyLines: true,
      complete: (result: ParseResult<CsvRow>) => {
        const rows = result.data.filter((row) => Object.values(row).some(Boolean));
        resolve(rows.map(mapper));
      },
      error: reject,
    });
  });
}

function parseDirection(value: string | undefined, amount: number): TransactionDirection {
  if (value === "credit" || value === "debit") {
    return value;
  }

  return amount >= 0 ? "credit" : "debit";
}
