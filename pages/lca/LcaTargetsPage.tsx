'use client';
import { CSSProperties, useEffect, useMemo, useState } from 'react';
import { supabase } from "@/lib/supabaseClient";
import { useRouter } from 'next/router';
import { logUsageEvent } from "@/utils/logUsageEvent";

type TargetRow = {
  id?: string;
  treetable_id: string;
  year: number;
  target_kg_co2e: number;
  notes?: string | null;
};

export function LcaTargetsPage() {
  const router = useRouter();
  const url = typeof window !== 'undefined' ? new URL(window.location.href) : null;
  const treetable_id = url?.searchParams.get('treetable_id') ?? 'default';
  const [rows, setRows] = useState<TargetRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const years = useMemo(() => {
    const y = new Date().getFullYear();
    return [y, y + 1, y + 2];
  }, []);

  useEffect(() => {
    let mounted = true;
    (async () => {
      setLoading(true);
      setError(null);
      const { data, error } = await supabase
        .from('lca_targets')
        .select('*')
        .eq('treetable_id', treetable_id)
        .order('year', { ascending: true });

      if (!mounted) return;

      if (error) {
        setError(error.message);
      } else {
        // 기존 데이터가 없으면 기본행 생성
        const existingYears = new Set((data ?? []).map((d) => d.year));
        const baseRows: TargetRow[] = years
          .filter((y) => !existingYears.has(y))
          .map((y) => ({
            treetable_id: treetable_id,
            year: y,
            target_kg_co2e: 0,
            notes: '',
          }));

        setRows([...(data as TargetRow[] ?? []), ...baseRows]);
      }
      setLoading(false);
    })();
    return () => {
      mounted = false;
    };
  }, [treetable_id, years]);

  const onChange = (idx: number, key: keyof TargetRow, value: string) => {
    setRows((prev) => {
      const copy = [...prev];
      const r = { ...copy[idx] };
      if (key === 'year') r.year = Number(value);
      else if (key === 'target_kg_co2e') r.target_kg_co2e = Number(value);
      else if (key === 'notes') r.notes = value;
      copy[idx] = r;
      return copy;
    });
  };

  const addRow = () => {
    const y = (rows.at(-1)?.year ?? new Date().getFullYear()) + 1;
    setRows((prev) => [
      ...prev,
      { treetable_id: treetable_id, year: y, target_kg_co2e: 0, notes: '' },
    ]);
  };

  const removeRow = (idx: number) => {
    setRows((prev) => prev.filter((_, i) => i !== idx));
  };


  const handleBack = async () => {
    await logUsageEvent("EBOM", "EBOM Table Open", {"note": "EBOM Table page opened after viewig the LCA target data"});
    router.back();
  };

  const save = async () => {
    setSaving(true);
    setError(null);
    // upsert: (treetable_id, year) 충돌 시 갱신
    const payload = rows.map((r) => {
      const base = {
        treetable_id: treetable_id,
        year: r.year,
        target_kg_co2e: r.target_kg_co2e,
        notes: r.notes ?? null,
      };
      return r.id ? { id: r.id, ...base } : base;
    });

    const { error } = await supabase
      .from('lca_targets')
      .upsert(payload, { onConflict: 'treetable_id,year' })
      .select();

    if (error) setError(error.message);
    setSaving(false);
    await logUsageEvent("LCA TARGET", "Setting a LCA Target (Carbon Emission target)", { note: "Setting the LCA target in the screen" });
  };


  if (loading) return <div className="p-6">불러오는 중…</div>;

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">LCA 목표 설정</h1>
        <div className="flex gap-2">
          <button className="btn" style={btnGhost} onClick={addRow}>행 추가</button>
          <button className="btn btn-primary" style={btnGhost} onClick={save} disabled={saving}>
            {saving ? '저장 중…' : '저장'}
          </button>
          <span style={{ margin: "0 8px" }}>|</span>  {/* 구분자 */}
          <button onClick={handleBack} style={btnGhost}>이전단계</button>
        </div>
      </div>

      <p className="text-sm text-gray-500">
        대상: <span className="font-mono">{treetable_id}</span> / 단위: kgCO₂e
      </p>

      {error && <div className="text-red-600 text-sm">{error}</div>}

      <div className="overflow-x-auto rounded-xl border">
        <table className="min-w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-2 text-left">연도</th>
              <th className="px-4 py-2 text-left">목표치 (kgCO₂e)</th>
              <th className="px-4 py-2 text-left">메모</th>
              <th className="px-4 py-2"></th>
            </tr>
          </thead>
          <tbody>
            {rows
              .sort((a, b) => a.year - b.year)
              .map((r, i) => (
                <tr key={`${r.id ?? 'new'}-${i}`} className="border-t">
                  <td className="px-4 py-2">
                    <input
                      type="number"
                      className="input"
                      value={r.year}
                      onChange={(e) => onChange(i, 'year', e.target.value)}
                    />
                  </td>
                  <td className="px-4 py-2">
                    <input
                      type="number"
                      step="0.001"
                      className="input"
                      value={r.target_kg_co2e}
                      onChange={(e) => onChange(i, 'target_kg_co2e', e.target.value)}
                    />
                  </td>
                  <td className="px-4 py-2">
                    <input
                      type="text"
                      className="input w-full"
                      value={r.notes ?? ''}
                      onChange={(e) => onChange(i, 'notes', e.target.value)}
                      placeholder="예: Scope 포함 범위 메모 등"
                    />
                  </td>
                  <td className="px-4 py-2 text-right">
                    <button className="btn btn-ghost" onClick={() => removeRow(i)}>
                      삭제
                    </button>
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>

      <p className="text-xs text-gray-500">
        저장하면 (treetable_id, year) 기준으로 upsert 되어 연도별 목표가 관리됩니다.
      </p>
    </div>
  );
}

const btnGhost: CSSProperties = {
  padding: "10px 16px",
  borderRadius: 12,
  border: "1px solid #e5e7eb",
  background: "white",        // ← 흰색 배경
  color: "#111827",
  fontWeight: 600,
  cursor: "pointer",
};

export default LcaTargetsPage; 