import React, { useState, useCallback, FormEvent } from 'react';

export interface SentinelSignal {
  readonly runId: string;
  readonly ticker: string;
  readonly latencyMs: number;
  readonly label: 'POSITIVE' | 'NEGATIVE' | 'NEUTRAL';
  readonly confidence: number;
  readonly reflectionScore: number;
  readonly hallucinationDetected: boolean;
  readonly report: string;
}

interface SentinelDashboardProps {
  readonly apiEndpoint?: string;
  readonly executePipeline?: (url: string, ticker: string) => Promise<SentinelSignal>;
}

const TICKER_REGEX = /^[A-Z]{1,5}$/;
const DEFAULT_ENDPOINT =
  import.meta.env?.VITE_SENTINEL_API_URL || 'http://localhost:8000/v1/agents/execute';

async function defaultPipelineExecutor(url: string, ticker: string): Promise<SentinelSignal> {
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ticker }),
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status} from Sentinel backend`);
  }

  const raw = await response.json();
  const rawLabel = String(raw?.sentiment?.label ?? 'NEUTRAL').toUpperCase();
  const validLabel =
    rawLabel === 'POSITIVE' || rawLabel === 'NEGATIVE' ? rawLabel : 'NEUTRAL';

  return Object.freeze({
    runId: String(raw.run_id ?? `run_${Date.now()}`),
    ticker: String(raw.ticker ?? ticker).replace(/[^A-Z]/g, '').slice(0, 5),
    latencyMs: Number(raw.latency_ms ?? 0),
    label: validLabel,
    confidence: Number(raw?.sentiment?.confidence ?? 0),
    reflectionScore: Number(raw?.self_reflection_qa?.score ?? 0),
    hallucinationDetected: Boolean(raw?.self_reflection_qa?.hallucination_detected),
    report: String(raw.report ?? ''),
  });
}

export const SentinelDashboard: React.FC<SentinelDashboardProps> = ({
  apiEndpoint = DEFAULT_ENDPOINT,
  executePipeline = defaultPipelineExecutor,
}) => {
  const [tickerInput, setTickerInput] = useState<string>('');
  const [signals, setSignals] = useState<ReadonlyArray<SentinelSignal>>([]);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);

  const handleTrigger = useCallback(
    async (e: FormEvent<HTMLFormElement>) => {
      e.preventDefault();
      const normalizedTicker = tickerInput.trim().toUpperCase();

      if (!TICKER_REGEX.test(normalizedTicker)) {
        setErrorMsg('Invalid ticker. Provide 1 to 5 alphabetic characters (e.g., NVDA, AAPL).');
        return;
      }

      setErrorMsg(null);
      setIsProcessing(true);

      try {
        const signal = await executePipeline(apiEndpoint, normalizedTicker);
        setSignals((prevSignals) => [signal, ...prevSignals]);
        setTickerInput('');
      } catch (err) {
        console.error('[SENTINEL_EXECUTION_FAILURE]:', err);
        setErrorMsg('Sentinel pipeline execution failed. Verify backend service status.');
      } finally {
        setIsProcessing(false);
      }
    },
    [tickerInput, apiEndpoint, executePipeline]
  );

  return (
    <section
      aria-labelledby="sentinel-title"
      className="max-w-3xl mx-auto p-6 bg-slate-950 text-slate-100 rounded-lg border border-slate-800"
    >
      <header className="mb-6">
        <h2 id="sentinel-title" className="text-xl font-semibold tracking-tight">
          FinBERT & MCP Agent Sentinel
        </h2>
        <p className="text-xs text-slate-400 mt-1">
          Headless Yahoo Finance RSS ingestion with self-reflection grounding verification.
        </p>
      </header>

      <form onSubmit={handleTrigger} className="flex gap-3 mb-6" noValidate>
        <div className="flex-1">
          <label htmlFor="ticker-input" className="sr-only">
            Ticker Symbol
          </label>
          <input
            id="ticker-input"
            type="text"
            value={tickerInput}
            onChange={(e) => setTickerInput(e.target.value)}
            placeholder="Enter Ticker (e.g., NVDA, MSFT)"
            maxLength={5}
            disabled={isProcessing}
            className="w-full px-4 py-2 bg-slate-900 border border-slate-700 rounded text-sm uppercase focus:outline-none focus:border-emerald-500"
          />
        </div>
        <button
          type="submit"
          disabled={isProcessing}
          className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-sm font-medium rounded transition"
        >
          {isProcessing ? 'Scanning RSS...' : 'Run Sentinel'}
        </button>
      </form>

      {errorMsg && (
        <div
          role="alert"
          className="p-3 mb-6 bg-red-950/60 border border-red-700 text-red-200 text-sm rounded"
        >
          {errorMsg}
        </div>
      )}

      <div className="space-y-4">
        {signals.map((item) => (
          <article
            key={item.runId}
            className="p-4 bg-slate-900/80 rounded border border-slate-800 space-y-2"
          >
            <div className="flex justify-between items-center text-xs font-mono">
              <span className="font-bold text-slate-200">{item.ticker}</span>
              <div className="flex gap-2">
                <span className="px-2 py-0.5 bg-slate-800 text-slate-300 rounded">
                  {item.latencyMs}ms
                </span>
                <span
                  className={`px-2 py-0.5 rounded font-semibold ${
                    item.label === 'POSITIVE'
                      ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                      : 'bg-amber-950 text-amber-300 border border-amber-800'
                  }`}
                >
                  {item.label} ({(item.confidence * 100).toFixed(1)}%)
                </span>
              </div>
            </div>

            <p className="text-sm text-slate-200 leading-relaxed">{item.report}</p>

            <footer className="pt-2 border-t border-slate-800/80 flex justify-between text-xs text-slate-400 font-mono">
              <span>Reflection QA: {(item.reflectionScore * 100).toFixed(0)}%</span>
              <span>
                Grounding: {item.hallucinationDetected ? 'FAILED (Drift Flagged)' : 'VERIFIED'}
              </span>
            </footer>
          </article>
        ))}
      </div>
    </section>
  );
};
