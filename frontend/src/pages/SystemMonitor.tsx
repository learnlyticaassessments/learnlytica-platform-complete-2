import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { Activity, Cpu, MemoryStick, Timer, Waves } from 'lucide-react';
import { analyticsService } from '../services/analyticsService';

type MonitorPoint = {
  timestamp: string;
  cpuPercent: number;
  memoryPercent: number;
  activeRuns: number;
  queuedRuns: number;
};

function Sparkline({
  values,
  color
}: {
  values: number[];
  color: string;
}) {
  const width = 360;
  const height = 84;
  const max = Math.max(1, ...values);
  const min = Math.min(...values);
  const range = Math.max(1, max - min);
  const points = values.map((v, idx) => {
    const x = values.length <= 1 ? 0 : (idx / (values.length - 1)) * width;
    const y = height - ((v - min) / range) * height;
    return `${x},${y}`;
  }).join(' ');

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-24">
      <polyline fill="none" stroke={color} strokeWidth="3" points={points} />
    </svg>
  );
}

export function SystemMonitor() {
  const [latest, setLatest] = useState<any | null>(null);
  const [history, setHistory] = useState<MonitorPoint[]>([]);
  const [error, setError] = useState('');

  useEffect(() => {
    let mounted = true;
    let timer: any = null;

    const tick = async () => {
      try {
        const res = await analyticsService.getSystemMonitor();
        if (!mounted) return;
        const data = res?.data || {};
        const host = data?.host || {};
        const evaluators = data?.evaluators || {};
        setLatest(data);
        setError('');
        setHistory((prev) => {
          const next = [...prev, {
            timestamp: data?.timestamp || new Date().toISOString(),
            cpuPercent: Number(host?.cpuPercent || 0),
            memoryPercent: Number(host?.memoryUsedPercent || 0),
            activeRuns: Number(evaluators?.activeRuns || 0),
            queuedRuns: Number(evaluators?.queuedRuns || 0)
          }];
          return next.slice(-60);
        });
      } catch (e: any) {
        if (!mounted) return;
        setError(e?.response?.data?.error || 'Failed to load system monitor');
      }
    };

    void tick();
    timer = setInterval(tick, 4000);
    return () => {
      mounted = false;
      if (timer) clearInterval(timer);
    };
  }, []);

  const cpuSeries = useMemo(() => history.map((h) => h.cpuPercent), [history]);
  const memSeries = useMemo(() => history.map((h) => h.memoryPercent), [history]);
  const activeSeries = useMemo(() => history.map((h) => h.activeRuns), [history]);
  const queuedSeries = useMemo(() => history.map((h) => h.queuedRuns), [history]);

  const host = latest?.host || {};
  const evals = latest?.evaluators || {};

  return (
    <div className="p-6 space-y-6 fade-in">
      <div className="page-header">
        <div>
          <h1 className="text-3xl font-bold text-[var(--text)]">System Monitor</h1>
          <p className="page-subtle mt-1">
            Live host resource usage and evaluator workload for this organization.
          </p>
        </div>
      </div>

      {error && <div className="ll-toast err">{error}</div>}

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        <MetricCard icon={<Cpu className="w-4 h-4" />} label="CPU Usage" value={`${Number(host.cpuPercent || 0).toFixed(1)}%`} />
        <MetricCard icon={<MemoryStick className="w-4 h-4" />} label="Memory Usage" value={`${Number(host.memoryUsedPercent || 0).toFixed(1)}%`} />
        <MetricCard icon={<Activity className="w-4 h-4" />} label="Active Evaluators" value={String(Number(evals.activeRuns || 0))} />
        <MetricCard icon={<Waves className="w-4 h-4" />} label="Queued Evaluators" value={String(Number(evals.queuedRuns || 0))} />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <div className="card p-4">
          <div className="text-sm font-semibold mb-2">CPU Trend (live)</div>
          {!!cpuSeries.length ? <Sparkline values={cpuSeries} color="#ef4444" /> : <div className="text-sm text-[var(--text-muted)]">No data yet.</div>}
        </div>
        <div className="card p-4">
          <div className="text-sm font-semibold mb-2">Memory Trend (live)</div>
          {!!memSeries.length ? <Sparkline values={memSeries} color="#3b82f6" /> : <div className="text-sm text-[var(--text-muted)]">No data yet.</div>}
        </div>
        <div className="card p-4">
          <div className="text-sm font-semibold mb-2">Active Evaluator Trend</div>
          {!!activeSeries.length ? <Sparkline values={activeSeries} color="#22c55e" /> : <div className="text-sm text-[var(--text-muted)]">No data yet.</div>}
        </div>
        <div className="card p-4">
          <div className="text-sm font-semibold mb-2">Queue Trend</div>
          {!!queuedSeries.length ? <Sparkline values={queuedSeries} color="#f59e0b" /> : <div className="text-sm text-[var(--text-muted)]">No data yet.</div>}
        </div>
      </div>

      <div className="card p-4 space-y-2 text-sm">
        <div className="flex items-center gap-2">
          <Timer className="w-4 h-4" />
          <span className="font-semibold">Runtime Snapshot</span>
        </div>
        <div>Host load (1m): <span className="font-semibold">{Number(host.cpuLoad1m || 0).toFixed(2)}</span></div>
        <div>Memory used: <span className="font-semibold">{Number(host.memoryUsedMb || 0)} MB</span> / {Number(host.memoryTotalMb || 0)} MB</div>
        <div>Completed evaluations (last 15 min): <span className="font-semibold">{Number(evals.completedLast15m || 0)}</span></div>
        <div>Queued submissions: <span className="font-semibold">{Number(evals.queuedSubmissions || 0)}</span></div>
        <div>Last update: <span className="font-semibold">{latest?.timestamp ? new Date(latest.timestamp).toLocaleTimeString() : '-'}</span></div>
      </div>
    </div>
  );
}

function MetricCard({ icon, label, value }: { icon: ReactNode; label: string; value: string }) {
  return (
    <div className="card p-4">
      <div className="flex items-center gap-2 text-[var(--text-muted)] text-xs uppercase tracking-wide">
        {icon}
        {label}
      </div>
      <div className="mt-2 text-2xl font-bold text-[var(--text)]">{value}</div>
    </div>
  );
}
