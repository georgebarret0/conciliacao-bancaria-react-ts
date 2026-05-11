export type TransactionDirection = "credit" | "debit";

export type BankTransaction = {
  id: string;
  date: string;
  description: string;
  document: string;
  amount: number;
  account: string;
  direction: TransactionDirection;
};

export type InternalEntry = {
  id: string;
  expectedDate: string;
  description: string;
  document: string;
  amount: number;
  costCenter: string;
  direction: TransactionDirection;
};

export type ReconciliationStatus =
  | "matched"
  | "value_divergence"
  | "date_divergence"
  | "missing_internal"
  | "missing_bank"
  | "manual_review";

export type ReconciliationRule = {
  amountTolerance: number;
  dateToleranceDays: number;
  requireDocumentMatch: boolean;
};

export type ReconciliationResult = {
  id: string;
  status: ReconciliationStatus;
  bankTransaction?: BankTransaction;
  internalEntry?: InternalEntry;
  amountDifference: number;
  dateDifferenceDays: number;
  confidence: number;
  reason: string;
};

export type Summary = {
  totalBankAmount: number;
  totalInternalAmount: number;
  totalDifference: number;
  matched: number;
  valueDivergence: number;
  dateDivergence: number;
  missingInternal: number;
  missingBank: number;
  manualReview: number;
};
