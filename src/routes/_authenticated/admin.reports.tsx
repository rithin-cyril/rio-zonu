import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { adminListBlessings } from "@/lib/admin.functions";

export const Route = createFileRoute("/_authenticated/admin/reports")({
  component: AdminReports,
});

type Row = {
  id: string;
  name: string;
  note: string;
  created_at: string;
  approved_at: string | null;
  status: "pending" | "approved" | "hidden" | "rejected";
  quality_score: number | null;
  ai_probability: number | null;
  analysis: any | null;
  analyzed_at: string | null;
  display_position: number | null;
  ai_rank: number | null;
};

const CATEGORIES = [
  { key: "emotional_quality", label: "❤️ Emotional Quality" },
  { key: "personalization", label: "👨‍👩‍👧 Personalization & Authenticity" },
  { key: "wedding_relevance", label: "💍 Wedding Relevance" },
  { key: "originality", label: "✨ Originality" },
  { key: "writing_quality", label: "📝 Writing Quality" },
  { key: "positive_sentiment", label: "😊 Positive Sentiment" },
] as const;

const SORTS = {
  position: "Display Position",
  score_desc: "Overall score (high → low)",
  score_asc: "Overall score (low → high)",
  ai_desc: "AI probability (high → low)",
  ai_asc: "AI probability (low → high)",
  chars_desc: "Character count (long → short)",
  chars_asc: "Character count (short → long)",
  date_desc: "Submission date (newest)",
  date_asc: "Submission date (oldest)",
  name_asc: "Guest name (A → Z)",
} as const;
type SortKey = keyof typeof SORTS;

const STATUSES = ["all", "approved", "pending", "hidden", "rejected"] as const;

const avg = (n: number[]) => (n.length ? Math.round(n.reduce((a, b) => a + b, 0) / n.length) : 0);
const pct = (part: number, total: number) => (total ? Math.round((part / total) * 100) : 0);
const words = (t: string) => t.trim().split(/\s+/).filter(Boolean).length;
const readingTime = (t: string) => `${Math.max(1, Math.round(words(t) / 200))} min`;

function classifyProb(p: number | null) {
  if (p === null || p === undefined) return { label: "Not analysed", cls: "border-gray-300 text-gray-600" };
  if (p <= 30) return { label: "🟢 Likely Human", cls: "border-emerald-300 text-emerald-700" };
  if (p <= 70) return { label: "🟡 Mixed / Uncertain", cls: "border-amber-300 text-amber-700" };
  return { label: "🔴 Likely AI-Generated", cls: "border-rose-300 text-rose-700" };
}

function medal(rank: number) {
  return rank === 1 ? "🥇" : rank === 2 ? "🥈" : rank === 3 ? "🥉" : `#${rank}`;
}

function Card({ title, value, sub }: { title: string; value: string; sub?: string }) {
  return (
    <div className="rounded-lg border border-gold/30 bg-white/90 p-4 shadow-gold">
      <p className="font-display text-[9px] tracking-[0.3em] uppercase ink-soft">{title}</p>
      <p className="mt-1 font-script text-2xl italic text-gold-gradient">{value}</p>
      {sub && <p className="font-script text-xs italic ink-soft">{sub}</p>}
    </div>
  );
}

function Bar({ label, value }: { label: string; value: number | null | undefined }) {
  const v = value ?? 0;
  return (
    <div>
      <div className="flex items-center justify-between">
        <span className="font-display text-[10px] tracking-[0.25em] uppercase ink-soft">{label}</span>
        <span className="font-display text-[10px] font-semibold ink">{value ?? "—"}/100</span>
      </div>
      <div className="mt-1 h-2 w-full overflow-hidden rounded-full bg-gold/10">
        <div className="h-full rounded-full bg-[oklch(0.72_0.11_80)]" style={{ width: `${Math.max(0, Math.min(100, v))}%` }} />
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-lg border border-gold/30 bg-white/90 p-4 shadow-gold">
      <h2 className="mb-3 font-display text-[10px] font-semibold tracking-[0.35em] uppercase text-gold-gradient">
        {title}
      </h2>
      {children}
    </section>
  );
}

function AdminReports() {
  const list = useServerFn(adminListBlessings);
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [sort, setSort] = useState<SortKey>("position");
  const [status, setStatus] = useState<(typeof STATUSES)[number]>("all");
  const [q, setQ] = useState("");
  const [openId, setOpenId] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      const r = await list();
      setRows(r.blessings as any);
    } catch (e: any) {
      toast.error(e?.message ?? "Failed to load report data");
    } finally {
      setLoading(false);
    }
  }, [list]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const scored = useMemo(() => rows.filter((r) => r.quality_score !== null), [rows]);

  const summary = useMemo(() => {
    const scores = scored.map((r) => r.quality_score as number);
    const probs = rows.filter((r) => r.ai_probability !== null).map((r) => r.ai_probability as number);
    const chars = rows.map((r) => r.note.length);
    const byScore = [...scored].sort((a, b) => (b.quality_score! - a.quality_score!));
    const byLen = [...rows].sort((a, b) => b.note.length - a.note.length);
    const cat = (key: string) =>
      [...scored].sort(
        (a, b) => (b.analysis?.breakdown?.[key] ?? -1) - (a.analysis?.breakdown?.[key] ?? -1),
      )[0] ?? null;
    return {
      total: rows.length,
      approved: rows.filter((r) => r.status === "approved").length,
      pending: rows.filter((r) => r.status === "pending").length,
      hidden: rows.filter((r) => r.status === "hidden").length,
      rejected: rows.filter((r) => r.status === "rejected").length,
      avgScore: avg(scores),
      avgAi: avg(probs),
      avgChars: avg(chars),
      highest: byScore[0] ?? null,
      lowest: byScore[byScore.length - 1] ?? null,
      above90: pct(scores.filter((s) => s > 90).length, scores.length),
      above80: pct(scores.filter((s) => s > 80).length, scores.length),
      longest: byLen[0] ?? null,
      shortest: byLen[byLen.length - 1] ?? null,
      mostHeartfelt: cat("emotional_quality"),
      mostOriginal: cat("originality"),
      highestAi: [...rows].filter((r) => r.ai_probability !== null).sort((a, b) => b.ai_probability! - a.ai_probability!)[0] ?? null,
      lowestAi: [...rows].filter((r) => r.ai_probability !== null).sort((a, b) => a.ai_probability! - b.ai_probability!)[0] ?? null,
    };
  }, [rows, scored]);

  const leaderboard = useMemo(
    () => [...scored].sort((a, b) => b.quality_score! - a.quality_score!),
    [scored],
  );

  const filtered = useMemo(() => {
    let out = rows.filter((r) => (status === "all" ? true : r.status === status));
    if (q.trim()) {
      const needle = q.trim().toLowerCase();
      out = out.filter((r) => r.name.toLowerCase().includes(needle));
    }
    const n = (v: number | null, d: number) => (v === null || v === undefined ? d : v);
    return [...out].sort((a, b) => {
      switch (sort) {
        case "position":
          return n(a.display_position, 9999) - n(b.display_position, 9999);
        case "score_desc": return n(b.quality_score, -1) - n(a.quality_score, -1);
        case "score_asc": return n(a.quality_score, 101) - n(b.quality_score, 101);
        case "ai_desc": return n(b.ai_probability, -1) - n(a.ai_probability, -1);
        case "ai_asc": return n(a.ai_probability, 101) - n(b.ai_probability, 101);
        case "chars_desc": return b.note.length - a.note.length;
        case "chars_asc": return a.note.length - b.note.length;
        case "date_desc": return b.created_at.localeCompare(a.created_at);
        case "date_asc": return a.created_at.localeCompare(b.created_at);
        case "name_asc": return a.name.localeCompare(b.name);
        default: return 0;
      }
    });
  }, [rows, sort, status, q]);

  const openRow = useMemo(() => rows.find((r) => r.id === openId) ?? null, [rows, openId]);

  if (loading) return <p className="font-script italic ink-soft">Loading report…</p>;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-2">
        <p className="font-script text-sm italic ink-soft">
          Built entirely from stored scores — no blessings are re-analysed here.
        </p>
        <button
          onClick={refresh}
          className="ml-auto rounded-md border border-gold/40 px-3 py-1.5 font-display text-[10px] tracking-[0.3em] uppercase ink-soft hover:bg-gold/5"
        >
          ↻ Refresh
        </button>
      </div>

      <Section title="Executive summary">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          <Card title="Total blessings" value={String(summary.total)} />
          <Card title="Approved" value={String(summary.approved)} />
          <Card title="Pending" value={String(summary.pending)} />
          <Card title="Hidden" value={String(summary.hidden)} />
          <Card title="Rejected" value={String(summary.rejected)} />
          <Card title="Average score" value={`${summary.avgScore}/100`} />
          <Card title="Average AI probability" value={`${summary.avgAi}%`} />
          <Card title="Average characters" value={String(summary.avgChars)} />
          <Card
            title="Highest scoring"
            value={summary.highest ? `${summary.highest.quality_score}/100` : "—"}
            sub={summary.highest?.name}
          />
          <Card
            title="Lowest scoring"
            value={summary.lowest ? `${summary.lowest.quality_score}/100` : "—"}
            sub={summary.lowest?.name}
          />
        </div>
      </Section>

      <Section title="Overall leaderboard">
        {leaderboard.length === 0 ? (
          <p className="font-script italic ink-soft">No analysed blessings yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-left">
              <thead>
                <tr className="font-display text-[9px] tracking-[0.25em] uppercase ink-soft">
                  <th className="py-2">Rank</th>
                  <th>Display pos.</th>
                  <th>Guest</th>
                  <th>Score</th>
                  <th>AI %</th>
                  <th>Chars</th>
                  <th />
                </tr>
              </thead>
              <tbody className="font-script text-sm italic ink">
                {leaderboard.map((r, i) => (
                  <tr key={r.id} className={`border-t border-gold/20 ${i < 3 ? "bg-gold/5" : ""}`}>
                    <td className="py-2">{medal(i + 1)}</td>
                    <td>#{r.display_position ?? "—"}</td>
                    <td>{r.name}</td>
                    <td>{r.quality_score}/100</td>
                    <td>{r.ai_probability ?? "—"}%</td>
                    <td>{r.note.length}</td>
                    <td>
                      <button
                        onClick={() => setOpenId(r.id)}
                        className="rounded border border-sky-400 px-2 py-1 font-display text-[9px] not-italic tracking-[0.2em] text-sky-700 hover:bg-sky-50"
                      >
                        REPORT
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Section>

      <Section title="Category rankings">
        <div className="grid gap-4 md:grid-cols-2">
          {CATEGORIES.map((c) => (
            <RankList
              key={c.key}
              title={c.label}
              rows={[...scored]
                .sort(
                  (a, b) =>
                    (b.analysis?.breakdown?.[c.key] ?? -1) - (a.analysis?.breakdown?.[c.key] ?? -1),
                )
                .slice(0, 10)}
              value={(r) => `${r.analysis?.breakdown?.[c.key] ?? "—"}/100`}
            />
          ))}
          <RankList
            title="📏 Character Count"
            rows={[...rows].sort((a, b) => b.note.length - a.note.length).slice(0, 10)}
            value={(r) => `${r.note.length} chars`}
          />
          <RankList
            title="🟢 Lowest AI Probability"
            rows={[...rows]
              .filter((r) => r.ai_probability !== null)
              .sort((a, b) => a.ai_probability! - b.ai_probability!)
              .slice(0, 10)}
            value={(r) => `${r.ai_probability}%`}
          />
          <RankList
            title="🔴 Highest AI Probability"
            rows={[...rows]
              .filter((r) => r.ai_probability !== null)
              .sort((a, b) => b.ai_probability! - a.ai_probability!)
              .slice(0, 10)}
            value={(r) => `${r.ai_probability}%`}
          />
        </div>
      </Section>

      <Section title="Insights">
        <ul className="grid gap-2 font-script text-sm italic ink-soft md:grid-cols-2">
          <li>⭐ Average blessing quality: <strong className="not-italic">{summary.avgScore}/100</strong></li>
          <li>📏 Average character count: <strong className="not-italic">{summary.avgChars}</strong></li>
          <li>🤖 Average AI probability: <strong className="not-italic">{summary.avgAi}%</strong></li>
          <li>🏆 Scoring above 90: <strong className="not-italic">{summary.above90}%</strong></li>
          <li>🎖 Scoring above 80: <strong className="not-italic">{summary.above80}%</strong></li>
          <li>📜 Longest blessing: <strong className="not-italic">{summary.longest?.name ?? "—"}</strong> ({summary.longest?.note.length ?? 0} chars)</li>
          <li>✂️ Shortest blessing: <strong className="not-italic">{summary.shortest?.name ?? "—"}</strong> ({summary.shortest?.note.length ?? 0} chars)</li>
          <li>❤️ Most heartfelt: <strong className="not-italic">{summary.mostHeartfelt?.name ?? "—"}</strong></li>
          <li>✨ Most original: <strong className="not-italic">{summary.mostOriginal?.name ?? "—"}</strong></li>
          <li>🔴 Highest AI probability: <strong className="not-italic">{summary.highestAi?.name ?? "—"}</strong> ({summary.highestAi?.ai_probability ?? "—"}%)</li>
          <li>🟢 Lowest AI probability: <strong className="not-italic">{summary.lowestAi?.name ?? "—"}</strong> ({summary.lowestAi?.ai_probability ?? "—"}%)</li>
        </ul>
      </Section>

      <Section title="All blessings">
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value as any)}
            aria-label="Filter by approval status"
            className="rounded-md border border-gold/40 bg-white px-2 py-1.5 font-display text-[10px] tracking-[0.2em] uppercase ink-soft"
          >
            {STATUSES.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value as SortKey)}
            aria-label="Sort blessings"
            className="rounded-md border border-gold/40 bg-white px-2 py-1.5 font-display text-[10px] tracking-[0.2em] uppercase ink-soft"
          >
            {Object.entries(SORTS).map(([k, label]) => (
              <option key={k} value={k}>{label}</option>
            ))}
          </select>
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search guest name…"
            aria-label="Search guest name"
            className="rounded-md border border-gold/40 bg-white px-3 py-1.5 font-script text-sm italic ink"
          />
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[680px] text-left">
            <thead>
              <tr className="font-display text-[9px] tracking-[0.25em] uppercase ink-soft">
                <th className="py-2">Display pos.</th>
                <th>AI rank</th>
                <th>Guest</th>
                <th>Status</th>
                <th>Score</th>
                <th>AI %</th>
                <th>Chars</th>
                <th>Submitted</th>
                <th />
              </tr>
            </thead>
            <tbody className="font-script text-sm italic ink">
              {filtered.map((r) => (
                <tr key={r.id} className="border-t border-gold/20">
                  <td className="py-2">#{r.display_position ?? "—"}</td>
                  <td>#{r.ai_rank ?? "—"}</td>
                  <td>{r.name}</td>
                  <td>{r.status}</td>
                  <td>{r.quality_score ?? "—"}</td>
                  <td>{r.ai_probability ?? "—"}%</td>
                  <td>{r.note.length}</td>
                  <td>{new Date(r.created_at).toLocaleDateString()}</td>
                  <td>
                    <button
                      onClick={() => setOpenId(r.id)}
                      className="rounded border border-sky-400 px-2 py-1 font-display text-[9px] not-italic tracking-[0.2em] text-sky-700 hover:bg-sky-50"
                    >
                      REPORT
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Section>

      {openRow && <ReportCard row={openRow} onClose={() => setOpenId(null)} />}
    </div>
  );
}

function RankList({
  title,
  rows,
  value,
}: {
  title: string;
  rows: Row[];
  value: (r: Row) => string;
}) {
  return (
    <div className="rounded-lg border border-gold/25 bg-[#FBF8F1]/60 p-3">
      <p className="mb-2 font-display text-[9px] tracking-[0.3em] uppercase ink-soft">{title}</p>
      {rows.length === 0 ? (
        <p className="font-script text-xs italic ink-soft">No data yet.</p>
      ) : (
        <ol className="space-y-1 font-script text-sm italic ink">
          {rows.map((r, i) => (
            <li key={r.id} className="flex items-center gap-2">
              <span className="w-6 shrink-0">{medal(i + 1)}</span>
              <span className="min-w-0 flex-1 truncate">{r.name}</span>
              <span className="shrink-0">{value(r)}</span>
              <span className="shrink-0 rounded-full border border-gold/40 px-1.5 font-display text-[8px] not-italic tracking-[0.15em] text-gold-gradient">
                #{r.display_position ?? "—"}
              </span>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}

function ReportCard({ row, onClose }: { row: Row; onClose: () => void }) {
  const b = row.analysis?.breakdown ?? {};
  const cls = classifyProb(row.ai_probability);
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/60 p-4" role="dialog" aria-modal="true">
      <div className="max-h-[85vh] w-full max-w-2xl overflow-y-auto rounded-lg border border-gold/40 bg-white p-6 shadow-2xl">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="font-script text-2xl italic text-gold-gradient">
            Report card — {row.name}
          </h3>
          <button onClick={onClose} className="rounded px-2 py-1 ink-soft hover:bg-gold/5">✕</button>
        </div>

        <div className="rounded-lg border border-gold/30 bg-[#FBF8F1]/60 p-4">
          <p className="font-display text-[10px] tracking-[0.3em] uppercase ink-soft">
            Overall blessing score
          </p>
          <p className="font-script text-3xl italic text-gold-gradient">
            {row.quality_score ?? "—"}/100
          </p>
          {row.analysis?.summary && (
            <p className="mt-1 font-script text-sm italic ink-soft">{row.analysis.summary}</p>
          )}
        </div>

        <div className="mt-5 space-y-3">
          <p className="font-display text-[10px] tracking-[0.3em] uppercase ink-soft">Score breakdown</p>
          <Bar label="❤️ Emotional quality" value={b.emotional_quality} />
          <Bar label="👨‍👩‍👧 Personalization & authenticity" value={b.personalization} />
          <Bar label="💍 Wedding relevance" value={b.wedding_relevance} />
          <Bar label="✨ Originality" value={b.originality} />
          <Bar label="📝 Writing quality" value={b.writing_quality} />
          <Bar label="😊 Positive sentiment" value={b.positive_sentiment} />
          <Bar label="📏 Character count contribution" value={b.length_contribution} />
        </div>

        <div className="mt-5 rounded-lg border border-gold/30 p-4">
          <p className="font-display text-[10px] tracking-[0.3em] uppercase ink-soft">🤖 AI analysis</p>
          <p className="mt-1 font-script text-xl italic ink">
            AI content probability: {row.ai_probability ?? "—"}%
          </p>
          <span className={`mt-1 inline-block rounded-full border px-2 py-0.5 font-display text-[9px] font-semibold tracking-[0.25em] uppercase ${cls.cls}`}>
            {cls.label}
          </span>
        </div>

        <div className="mt-5 grid grid-cols-2 gap-3 font-script text-sm italic ink-soft">
          <p>📏 Characters: {row.note.length}</p>
          <p>🔤 Words: {words(row.note)}</p>
          <p>⏱ Reading time: {readingTime(row.note)}</p>
          <p>🤖 AI overall rank: #{row.ai_rank ?? "—"}</p>
          <p>📍 Display position: #{row.display_position ?? "—"}</p>
          <p>✅ Status: {row.status}</p>
          <p>🗓 Submitted: {new Date(row.created_at).toLocaleString()}</p>
          <p>
            💍 Approved:{" "}
            {row.approved_at ? new Date(row.approved_at).toLocaleString() : "—"}
          </p>
        </div>
      </div>
    </div>
  );
}
