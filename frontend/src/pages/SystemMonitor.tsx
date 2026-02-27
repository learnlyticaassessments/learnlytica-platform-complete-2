import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { Activity, Cpu, MemoryStick, Timer, Waves, Gauge, ClipboardList } from 'lucide-react';
import { analyticsService } from '../services/analyticsService';

type MonitorPoint = {
  timestamp: string;
  cpuPercent: number;
  memoryPercent: number;
  activeRuns: number;
  queuedRuns: number;
};

function AxisChart({
  values,
  color,
  yMin = 0,
  yMax,
  valueFormatter
}: {
  values: number[];
  color: string;
  yMin?: number;
  yMax?: number;
  valueFormatter?: (value: number) => string;
}) {
  const width = 420;
  const height = 160;
  const margin = { top: 12, right: 10, bottom: 24, left: 42 };
  const innerW = width - margin.left - margin.right;
  const innerH = height - margin.top - margin.bottom;
  const actualMax = Number.isFinite(yMax) ? Number(yMax) : Math.max(1, ...values);
  const actualMin = Math.min(yMin, ...values, 0);
  const range = Math.max(1, actualMax - actualMin);
  const fmt = valueFormatter || ((v: number) => `${v.toFixed(0)}`);
  const points = values.map((v, idx) => {
    const x = margin.left + (values.length <= 1 ? 0 : (idx / (values.length - 1)) * innerW);
    const y = margin.top + innerH - ((v - actualMin) / range) * innerH;
    return `${x},${y}`;
  }).join(' ');

  const yTicks = [actualMin, actualMin + range / 2, actualMax];

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-32">
      {yTicks.map((t, idx) => {
        const y = margin.top + innerH - ((t - actualMin) / range) * innerH;
        return (
          <g key={`y-${idx}`}>
            <line x1={margin.left} x2={width - margin.right} y1={y} y2={y} stroke="var(--border)" strokeDasharray="3 4" />
            <text x={8} y={y + 4} fontSize="10" fill="var(--text-muted)">{fmt(t)}</text>
          </g>
        );
      })}
      <line x1={margin.left} y1={margin.top + innerH} x2={width - margin.right} y2={margin.top + innerH} stroke="var(--border)" />
      <polyline fill="none" stroke={color} strokeWidth="2.5" points={points} />
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
  const assessments = latest?.assessments || {};
  const capacity = latest?.capacity || {};
  const projectCap = capacity?.projectEvaluations || {};
  const assessmentCap = capacity?.assessmentSubmissions || {};
  const firstTs = history[0]?.timestamp;
  const lastTs = history[history.length - 1]?.timestamp;

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

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <MetricCard
          icon={<Gauge className="w-4 h-4" />}
          label="Project Eval Capacity"
          value={`${Number(projectCap.currentLoad || 0)} / ${Number(projectCap.estimatedNow || 0)}`}
          subValue={`max ${Number(projectCap.estimatedMax || 0)}`}
        />
        <MetricCard
          icon={<ClipboardList className="w-4 h-4" />}
          label="Assessment Capacity"
          value={`${Number(assessmentCap.currentLoad || 0)} / ${Number(assessmentCap.estimatedNow || 0)}`}
          subValue={`max ${Number(assessmentCap.estimatedMax || 0)}`}
        />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <div className="card p-4">
          <div className="text-sm font-semibold mb-2">CPU Trend (live)</div>
          {!!cpuSeries.length ? (
            <>
              <AxisChart values={cpuSeries} color="#ef4444" yMin={0} yMax={100} valueFormatter={(v) => `${v.toFixed(0)}%`} />
              <div className="flex items-center justify-between text-[10px] text-[var(--text-muted)]">
                <span>X: {firstTs ? new Date(firstTs).toLocaleTimeString() : '-'}</span>
                <span>X: {lastTs ? new Date(lastTs).toLocaleTimeString() : '-'}</span>
              </div>
            </>
          ) : <div className="text-sm text-[var(--text-muted)]">No data yet.</div>}
        </div>
        <div className="card p-4">
          <div className="text-sm font-semibold mb-2">Memory Trend (live)</div>
          {!!memSeries.length ? (
            <>
              <AxisChart values={memSeries} color="#3b82f6" yMin={0} yMax={100} valueFormatter={(v) => `${v.toFixed(0)}%`} />
              <div className="flex items-center justify-between text-[10px] text-[var(--text-muted)]">
                <span>X: {firstTs ? new Date(firstTs).toLocaleTimeString() : '-'}</span>
                <span>X: {lastTs ? new Date(lastTs).toLocaleTimeString() : '-'}</span>
              </div>
            </>
          ) : <div className="text-sm text-[var(--text-muted)]">No data yet.</div>}
        </div>
        <div className="card p-4">
          <div className="text-sm font-semibold mb-2">Active Evaluator Trend</div>
          {!!activeSeries.length ? (
            <>
              <AxisChart values={activeSeries} color="#22c55e" yMin={0} valueFormatter={(v) => `${v.toFixed(0)}`} />
              <div className="flex items-center justify-between text-[10px] text-[var(--text-muted)]">
                <span>X: {firstTs ? new Date(firstTs).toLocaleTimeString() : '-'}</span>
                <span>X: {lastTs ? new Date(lastTs).toLocaleTimeString() : '-'}</span>
              </div>
            </>
          ) : <div className="text-sm text-[var(--text-muted)]">No data yet.</div>}
        </div>
        <div className="card p-4">
          <div className="text-sm font-semibold mb-2">Queue Trend</div>
          {!!queuedSeries.length ? (
            <>
              <AxisChart values={queuedSeries} color="#f59e0b" yMin={0} valueFormatter={(v) => `${v.toFixed(0)}`} />
              <div className="flex items-center justify-between text-[10px] text-[var(--text-muted)]">
                <span>X: {firstTs ? new Date(firstTs).toLocaleTimeString() : '-'}</span>
                <span>X: {lastTs ? new Date(lastTs).toLocaleTimeString() : '-'}</span>
              </div>
            </>
          ) : <div className="text-sm text-[var(--text-muted)]">No data yet.</div>}
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
        <div>Assessments in progress: <span className="font-semibold">{Number(assessments.inProgressCount || 0)}</span></div>
        <div>Last update: <span className="font-semibold">{latest?.timestamp ? new Date(latest.timestamp).toLocaleTimeString() : '-'}</span></div>
      </div>
    </div>
  );
}

function MetricCard({ icon, label, value, subValue }: { icon: ReactNode; label: string; value: string; subValue?: string }) {
  return (
    <div className="card p-4">
      <div className="flex items-center gap-2 text-[var(--text-muted)] text-xs uppercase tracking-wide">
        {icon}
        {label}
      </div>
      <div className="mt-2 text-2xl font-bold text-[var(--text)]">{value}</div>
      {subValue && <div className="text-xs text-[var(--text-muted)] mt-1">{subValue}</div>}
    </div>
  );
}
