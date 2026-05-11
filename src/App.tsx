import {
  AlertTriangle,
  ArrowDownToLine,
  BadgeCheck,
  Banknote,
  Calculator,
  CheckCircle2,
  CircleDollarSign,
  FileInput,
  FileSpreadsheet,
  Filter,
  RefreshCcw,
  Search,
  Upload,
} from "lucide-react";
import { useMemo, useRef, useState } from "react";
import "./App.css";
import { sampleBankTransactions, sampleInternalEntries } from "./data/sampleData";
import { bankCsvTemplate, internalCsvTemplate } from "./lib/csvTemplates";
import { parseBankCsv, parseInternalCsv } from "./lib/csv";
import { formatCurrency, formatDate, numberFormatter } from "./lib/formatters";
import { defaultRule, reconcileTransactions, summarizeResults } from "./lib/reconciliation";
import type {
  BankTransaction,
  InternalEntry,
  ReconciliationResult,
  ReconciliationRule,
  ReconciliationStatus,
} from "./types";

type FilterStatus = ReconciliationStatus | "all";
type ViewMode = "results" | "bank" | "internal";

const statusLabels: Record<ReconciliationStatus, string> = {
  matched: "Conciliado",
  value_divergence: "Divergência de valor",
  date_divergence: "Divergência de data",
  missing_internal: "Sem lançamento interno",
  missing_bank: "Sem movimento bancário",
  manual_review: "Revisão manual",
};

function App() {
  const [bankTransactions, setBankTransactions] = useState<BankTransaction[]>(sampleBankTransactions);
  const [internalEntries, setInternalEntries] = useState<InternalEntry[]>(sampleInternalEntries);
  const [rule, setRule] = useState<ReconciliationRule>(defaultRule);
  const [statusFilter, setStatusFilter] = useState<FilterStatus>("all");
  const [search, setSearch] = useState("");
  const [viewMode, setViewMode] = useState<ViewMode>("results");
  const [lastRunAt, setLastRunAt] = useState(() => new Date());

  const bankInputRef = useRef<HTMLInputElement>(null);
  const internalInputRef = useRef<HTMLInputElement>(null);

  const results = useMemo(
    () => reconcileTransactions(bankTransactions, internalEntries, rule),
    [bankTransactions, internalEntries, rule],
  );

  const summary = useMemo(
    () => summarizeResults(results, bankTransactions, internalEntries),
    [results, bankTransactions, internalEntries],
  );

  const filteredResults = useMemo(() => {
    const normalizedSearch = search.toLowerCase().trim();

    return results.filter((result) => {
      const statusMatches = statusFilter === "all" || result.status === statusFilter;
      const searchable = [
        result.bankTransaction?.description,
        result.bankTransaction?.document,
        result.internalEntry?.description,
        result.internalEntry?.document,
        result.reason,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return statusMatches && (!normalizedSearch || searchable.includes(normalizedSearch));
    });
  }, [results, search, statusFilter]);

  function runReconciliation() {
    setLastRunAt(new Date());
  }

  function resetDemo() {
    setBankTransactions(sampleBankTransactions);
    setInternalEntries(sampleInternalEntries);
    setRule(defaultRule);
    setStatusFilter("all");
    setSearch("");
    setLastRunAt(new Date());
  }

  async function importBankCsv(file: File | undefined) {
    if (!file) return;
    setBankTransactions(await parseBankCsv(file));
    setLastRunAt(new Date());
  }

  async function importInternalCsv(file: File | undefined) {
    if (!file) return;
    setInternalEntries(await parseInternalCsv(file));
    setLastRunAt(new Date());
  }

  return (
    <main className="app-shell">
      <aside className="sidebar" aria-label="Resumo da rotina">
        <div className="brand">
          <span className="brand-mark">
            <Banknote size={22} />
          </span>
          <div>
            <strong>Conciliação Bancária</strong>
            <small>React + TypeScript</small>
          </div>
        </div>

        <nav className="nav-list" aria-label="Visoes">
          <button className={viewMode === "results" ? "active" : ""} onClick={() => setViewMode("results")}>
            <Calculator size={18} />
            Resultado
          </button>
          <button className={viewMode === "bank" ? "active" : ""} onClick={() => setViewMode("bank")}>
            <FileSpreadsheet size={18} />
            Extrato
          </button>
          <button className={viewMode === "internal" ? "active" : ""} onClick={() => setViewMode("internal")}>
            <FileInput size={18} />
            Interno
          </button>
        </nav>

        <div className="side-metric">
          <span>Diferenca total</span>
          <strong className={summary.totalDifference === 0 ? "ok" : "attention"}>
            {formatCurrency(summary.totalDifference)}
          </strong>
        </div>

        <div className="side-list">
          <SideLine label="Conciliados" value={summary.matched} tone="ok" />
          <SideLine label="Divergencias" value={summary.valueDivergence + summary.dateDivergence} tone="warn" />
          <SideLine label="Pendencias" value={summary.missingBank + summary.missingInternal} tone="bad" />
        </div>
      </aside>

      <section className="workspace">
        <header className="topbar">
          <div>
            <p className="eyebrow">Rotina financeira - Maio/2026</p>
            <h1>Conferência automatizada de extrato x lançamentos</h1>
          </div>
          <div className="topbar-actions">
            <span className="sync-pill">Ultima execucao: {lastRunAt.toLocaleTimeString("pt-BR")}</span>
            <button className="ghost-button" onClick={resetDemo}>
              <RefreshCcw size={17} />
              Restaurar demo
            </button>
            <button className="primary-button" onClick={runReconciliation}>
              <Calculator size={17} />
              Executar conciliação
            </button>
          </div>
        </header>

        <section className="summary-grid" aria-label="Resumo da conciliacao">
          <MetricCard icon={<CircleDollarSign />} label="Extrato bancario" value={formatCurrency(summary.totalBankAmount)} />
          <MetricCard icon={<CircleDollarSign />} label="Lançamentos internos" value={formatCurrency(summary.totalInternalAmount)} />
          <MetricCard icon={<BadgeCheck />} label="Conciliados" value={summary.matched.toString()} tone="ok" />
          <MetricCard icon={<AlertTriangle />} label="Pendencias" value={(summary.missingBank + summary.missingInternal + summary.manualReview).toString()} tone="warn" />
        </section>

        <section className="control-strip" aria-label="Controles da conciliacao">
          <div className="field">
            <label htmlFor="search">Busca</label>
            <div className="input-with-icon">
              <Search size={16} />
              <input
                id="search"
                type="search"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
            placeholder="documento, descrição ou motivo"
              />
            </div>
          </div>

          <div className="field">
            <label htmlFor="status">Status</label>
            <select id="status" value={statusFilter} onChange={(event) => setStatusFilter(event.target.value as FilterStatus)}>
              <option value="all">Todos</option>
              {Object.entries(statusLabels).map(([status, label]) => (
                <option key={status} value={status}>
                  {label}
                </option>
              ))}
            </select>
          </div>

          <div className="field compact">
            <label htmlFor="amountTolerance">Tolerancia valor</label>
            <input
              id="amountTolerance"
              type="number"
              min="0"
              step="0.5"
              value={rule.amountTolerance}
              onChange={(event) => setRule({ ...rule, amountTolerance: Number(event.target.value) })}
            />
          </div>

          <div className="field compact">
            <label htmlFor="dateTolerance">Tolerancia dias</label>
            <input
              id="dateTolerance"
              type="number"
              min="0"
              value={rule.dateToleranceDays}
              onChange={(event) => setRule({ ...rule, dateToleranceDays: Number(event.target.value) })}
            />
          </div>

          <label className="switch-control">
            <input
              type="checkbox"
              checked={rule.requireDocumentMatch}
              onChange={(event) => setRule({ ...rule, requireDocumentMatch: event.target.checked })}
            />
            <span>Exigir documento</span>
          </label>
        </section>

        <section className="action-row" aria-label="Importacao e exportacao">
          <input
            ref={bankInputRef}
            className="hidden-input"
            type="file"
            accept=".csv,text/csv"
            onChange={(event) => void importBankCsv(event.target.files?.[0])}
          />
          <input
            ref={internalInputRef}
            className="hidden-input"
            type="file"
            accept=".csv,text/csv"
            onChange={(event) => void importInternalCsv(event.target.files?.[0])}
          />

          <button className="secondary-button" onClick={() => bankInputRef.current?.click()}>
            <Upload size={17} />
            Importar extrato CSV
          </button>
          <button className="secondary-button" onClick={() => internalInputRef.current?.click()}>
            <Upload size={17} />
            Importar lançamentos CSV
          </button>
          <button className="secondary-button" onClick={() => downloadText("modelo-extrato.csv", bankCsvTemplate)}>
            <ArrowDownToLine size={17} />
            Modelo extrato
          </button>
          <button className="secondary-button" onClick={() => downloadText("modelo-lancamentos.csv", internalCsvTemplate)}>
            <ArrowDownToLine size={17} />
            Modelo interno
          </button>
          <button className="secondary-button strong" onClick={() => exportResults(filteredResults)}>
            <FileSpreadsheet size={17} />
            Exportar resultado
          </button>
        </section>

        {viewMode === "results" && <ResultsView results={filteredResults} />}
        {viewMode === "bank" && <BankView rows={bankTransactions} />}
        {viewMode === "internal" && <InternalView rows={internalEntries} />}
      </section>
    </main>
  );
}

function MetricCard({
  icon,
  label,
  value,
  tone = "neutral",
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  tone?: "neutral" | "ok" | "warn";
}) {
  return (
    <article className={`metric-card ${tone}`}>
      <span>{icon}</span>
      <div>
        <p>{label}</p>
        <strong>{value}</strong>
      </div>
    </article>
  );
}

function SideLine({ label, value, tone }: { label: string; value: number; tone: "ok" | "warn" | "bad" }) {
  return (
    <div className="side-line">
      <span>{label}</span>
      <strong className={tone}>{value}</strong>
    </div>
  );
}

function ResultsView({ results }: { results: ReconciliationResult[] }) {
  return (
    <section className="panel">
      <PanelHeader icon={<Filter size={18} />} title="Resultado da conciliação" meta={`${results.length} registros`} />
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Status</th>
              <th>Documento</th>
              <th>Banco</th>
              <th>Interno</th>
              <th>Diferenca</th>
              <th>Dias</th>
              <th>Confianca</th>
              <th>Motivo</th>
            </tr>
          </thead>
          <tbody>
            {results.map((result) => (
              <tr key={result.id}>
                <td>
                  <StatusBadge status={result.status} />
                </td>
                <td>{result.bankTransaction?.document ?? result.internalEntry?.document ?? "-"}</td>
                <td>
                  <strong>{result.bankTransaction ? formatCurrency(result.bankTransaction.amount) : "-"}</strong>
                  <small>{result.bankTransaction ? formatDate(result.bankTransaction.date) : ""}</small>
                </td>
                <td>
                  <strong>{result.internalEntry ? formatCurrency(result.internalEntry.amount) : "-"}</strong>
                  <small>{result.internalEntry ? formatDate(result.internalEntry.expectedDate) : ""}</small>
                </td>
                <td className={Math.abs(result.amountDifference) > 0.5 ? "money-diff" : ""}>{formatCurrency(result.amountDifference)}</td>
                <td>{result.dateDifferenceDays}</td>
                <td>{numberFormatter.format(result.confidence)}%</td>
                <td>{result.reason}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function BankView({ rows }: { rows: BankTransaction[] }) {
  return (
    <section className="panel">
      <PanelHeader icon={<Banknote size={18} />} title="Extrato bancario" meta={`${rows.length} movimentos`} />
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Data</th>
              <th>Documento</th>
              <th>Descricao</th>
              <th>Conta</th>
              <th>Valor</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id}>
                <td>{formatDate(row.date)}</td>
                <td>{row.document}</td>
                <td>{row.description}</td>
                <td>{row.account}</td>
                <td className={row.amount < 0 ? "debit" : "credit"}>{formatCurrency(row.amount)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function InternalView({ rows }: { rows: InternalEntry[] }) {
  return (
    <section className="panel">
      <PanelHeader icon={<FileInput size={18} />} title="Lançamentos internos" meta={`${rows.length} registros`} />
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Data prevista</th>
              <th>Documento</th>
              <th>Descricao</th>
              <th>Centro de custo</th>
              <th>Valor</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id}>
                <td>{formatDate(row.expectedDate)}</td>
                <td>{row.document}</td>
                <td>{row.description}</td>
                <td>{row.costCenter}</td>
                <td className={row.amount < 0 ? "debit" : "credit"}>{formatCurrency(row.amount)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function PanelHeader({ icon, title, meta }: { icon: React.ReactNode; title: string; meta: string }) {
  return (
    <div className="panel-header">
      <div>
        <span>{icon}</span>
        <h2>{title}</h2>
      </div>
      <small>{meta}</small>
    </div>
  );
}

function StatusBadge({ status }: { status: ReconciliationStatus }) {
  const icon = status === "matched" ? <CheckCircle2 size={14} /> : <AlertTriangle size={14} />;

  return (
    <span className={`status-badge ${status}`}>
      {icon}
      {statusLabels[status]}
    </span>
  );
}

function exportResults(results: ReconciliationResult[]) {
  const header = "status,documento,valor_banco,valor_interno,diferenca,dias,confianca,motivo";
  const rows = results.map((result) =>
    [
      statusLabels[result.status],
      result.bankTransaction?.document ?? result.internalEntry?.document ?? "",
      result.bankTransaction?.amount ?? "",
      result.internalEntry?.amount ?? "",
      result.amountDifference,
      result.dateDifferenceDays,
      result.confidence,
      result.reason,
    ]
      .map((value) => `"${String(value).replaceAll('"', '""')}"`)
      .join(","),
  );

  downloadText("resultado-conciliacao.csv", [header, ...rows].join("\n"));
}

function downloadText(fileName: string, content: string) {
  const blob = new Blob([content], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  link.click();
  URL.revokeObjectURL(url);
}

export default App;
