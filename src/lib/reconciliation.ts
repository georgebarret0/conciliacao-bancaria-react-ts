import type {
  BankTransaction,
  InternalEntry,
  ReconciliationResult,
  ReconciliationRule,
  ReconciliationStatus,
  Summary,
} from "../types";
import { normalizeText } from "./formatters";

type MatchCandidate = {
  entry: InternalEntry;
  amountDifference: number;
  dateDifferenceDays: number;
  documentMatch: boolean;
  descriptionMatch: boolean;
  score: number;
};

const MS_PER_DAY = 86_400_000;

export const defaultRule: ReconciliationRule = {
  amountTolerance: 0.5,
  dateToleranceDays: 1,
  requireDocumentMatch: true,
};

export function reconcileTransactions(
  bankTransactions: BankTransaction[],
  internalEntries: InternalEntry[],
  rule: ReconciliationRule,
): ReconciliationResult[] {
  const matchedEntries = new Set<string>();

  const bankResults = bankTransactions.map((bankTransaction) => {
    const candidates = internalEntries
      .filter((entry) => !matchedEntries.has(entry.id))
      .map((entry) => buildCandidate(bankTransaction, entry))
      .filter((candidate) => isRelevantCandidate(candidate, rule))
      .sort((a, b) => b.score - a.score);

    const bestCandidate = candidates[0];

    if (!bestCandidate) {
      return buildResult({
        status: "missing_internal",
        bankTransaction,
        amountDifference: bankTransaction.amount,
        dateDifferenceDays: 0,
        confidence: 0,
        reason: "Movimento bancário sem lançamento interno correspondente.",
      });
    }

    matchedEntries.add(bestCandidate.entry.id);

    const status = classifyCandidate(bestCandidate, rule);

    return buildResult({
      status,
      bankTransaction,
      internalEntry: bestCandidate.entry,
      amountDifference: bestCandidate.amountDifference,
      dateDifferenceDays: bestCandidate.dateDifferenceDays,
      confidence: bestCandidate.score,
      reason: statusReason(status),
    });
  });

  const missingBankResults = internalEntries
    .filter((entry) => !matchedEntries.has(entry.id))
    .map((entry) =>
      buildResult({
        status: "missing_bank",
        internalEntry: entry,
        amountDifference: -entry.amount,
        dateDifferenceDays: 0,
        confidence: 0,
        reason: "Lançamento interno ainda não encontrado no extrato bancário.",
      }),
    );

  return [...bankResults, ...missingBankResults];
}

export function summarizeResults(
  results: ReconciliationResult[],
  bankTransactions: BankTransaction[],
  internalEntries: InternalEntry[],
): Summary {
  const countByStatus = (status: ReconciliationStatus) =>
    results.filter((result) => result.status === status).length;

  const totalBankAmount = bankTransactions.reduce((sum, item) => sum + item.amount, 0);
  const totalInternalAmount = internalEntries.reduce((sum, item) => sum + item.amount, 0);

  return {
    totalBankAmount,
    totalInternalAmount,
    totalDifference: totalBankAmount - totalInternalAmount,
    matched: countByStatus("matched"),
    valueDivergence: countByStatus("value_divergence"),
    dateDivergence: countByStatus("date_divergence"),
    missingInternal: countByStatus("missing_internal"),
    missingBank: countByStatus("missing_bank"),
    manualReview: countByStatus("manual_review"),
  };
}

function buildCandidate(bankTransaction: BankTransaction, entry: InternalEntry): MatchCandidate {
  const amountDifference = roundMoney(bankTransaction.amount - entry.amount);
  const dateDifferenceDays = differenceInDays(bankTransaction.date, entry.expectedDate);
  const documentMatch = documentsMatch(bankTransaction.document, entry.document);
  const descriptionMatch = descriptionsOverlap(bankTransaction.description, entry.description);
  const exactAmount = Math.abs(amountDifference) <= 0.5;
  const sameDirection = bankTransaction.direction === entry.direction;

  let score = 0;

  if (documentMatch) score += 55;
  if (exactAmount) score += 20;
  if (Math.abs(dateDifferenceDays) <= 1) score += 15;
  if (descriptionMatch) score += 8;
  if (sameDirection) score += 2;

  return {
    entry,
    amountDifference,
    dateDifferenceDays,
    documentMatch,
    descriptionMatch,
    score,
  };
}

function isRelevantCandidate(candidate: MatchCandidate, rule: ReconciliationRule): boolean {
  if (rule.requireDocumentMatch && candidate.documentMatch) {
    return true;
  }

  if (rule.requireDocumentMatch) {
    return false;
  }

  return candidate.score >= 35;
}

function classifyCandidate(candidate: MatchCandidate, rule: ReconciliationRule): ReconciliationStatus {
  const amountOk = Math.abs(candidate.amountDifference) <= rule.amountTolerance;
  const dateOk = Math.abs(candidate.dateDifferenceDays) <= rule.dateToleranceDays;

  if (amountOk && dateOk) return "matched";
  if (!amountOk && dateOk) return "value_divergence";
  if (amountOk && !dateOk) return "date_divergence";

  return "manual_review";
}

function buildResult(input: Omit<ReconciliationResult, "id">): ReconciliationResult {
  return {
    id: [
      input.bankTransaction?.id ?? "sem-banco",
      input.internalEntry?.id ?? "sem-interno",
      input.status,
    ].join("_"),
    ...input,
  };
}

function differenceInDays(bankDate: string, expectedDate: string): number {
  const bank = new Date(`${bankDate}T00:00:00`);
  const expected = new Date(`${expectedDate}T00:00:00`);
  return Math.round((bank.getTime() - expected.getTime()) / MS_PER_DAY);
}

function documentsMatch(bankDocument: string, entryDocument: string): boolean {
  return normalizeText(bankDocument) === normalizeText(entryDocument);
}

function descriptionsOverlap(bankDescription: string, entryDescription: string): boolean {
  const bankTerms = new Set(normalizeText(bankDescription).split(" ").filter(Boolean));
  const entryTerms = normalizeText(entryDescription).split(" ").filter(Boolean);
  const sharedTerms = entryTerms.filter((term) => term.length > 3 && bankTerms.has(term));

  return sharedTerms.length >= 1;
}

function statusReason(status: ReconciliationStatus): string {
  const reasons: Record<ReconciliationStatus, string> = {
    matched: "Documento, valor e data dentro da tolerancia configurada.",
    value_divergence: "Documento localizado, mas valor difere do lancamento interno.",
    date_divergence: "Documento e valor localizados, mas data esta fora da tolerancia.",
    missing_internal: "Movimento bancário sem lançamento interno correspondente.",
    missing_bank: "Lançamento interno sem movimento bancário correspondente.",
    manual_review: "Documento localizado, mas valor e data exigem revisão manual.",
  };

  return reasons[status];
}

function roundMoney(value: number): number {
  return Math.round(value * 100) / 100;
}
