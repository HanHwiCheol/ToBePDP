// components/LCAReport.tsx
"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  PieChart, Pie, Cell, Tooltip as ReTooltip, Legend,
  BarChart, Bar, XAxis, YAxis, CartesianGrid
} from "recharts";
import { useRouter } from "next/router";
import { logUsageEvent } from "@/utils/logUsageEvent";
import type { Payload } from "recharts/types/component/DefaultTooltipContent";

type Item = {
  material: string;
  material_label: string;
  mass_kg: number;                 // 총질량(kg)
  ef_kgco2e_perkg: number;         // 배출계수(kgCO2e/kg)
  carbon_kgco2e: number;           // 해당 재질 탄소 총량(kgCO2e)
};
type Resp = {
  tableId: string;
  totals: { mass_kg: number; carbon_kgco2e: number };
  items: Item[];
};

export default function LCAReport({ tableId }: { tableId: string }) {
  const [data, setData] = useState<Resp | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const chartRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  useEffect(() => {
    (async () => {
      try {
        const r = await fetch(`/api/reports/${encodeURIComponent(tableId)}`, { cache: "no-store" });
        if (!r.ok) throw new Error(await r.text());
        setData(await r.json());
      } catch (e: unknown) {
        if (e instanceof Error) {
          setErr(e?.message ?? "fetch error");
        }

      } finally {
        setLoading(false);
      }
    })();
  }, [tableId]);


  // 파이차트: 재질별 탄소 비중(kgCO2e)
  const pieData = useMemo(() => {
    if (!data) return [];
    const totalC = data.totals.carbon_kgco2e || 0;

    // ✅ "No Material" 등은 그래프에서 제외
    const filtered = data.items.filter(
      (it) =>
        it.material &&
        !["no material", "assembly", "none"].includes(it.material.toLowerCase())
    );

    return filtered.map((it) => {
      const val = Number((it.carbon_kgco2e ?? 0).toFixed(6));
      const pct = totalC ? (val / totalC) * 100 : 0;
      return { name: it.material_label, value: val, pct };
    });
  }, [data]);

  // 막대차트: 재질별 (좌:총질량 kg, 우:탄소 kgCO2e)
  const barData = useMemo(() => {
    if (!data) return [];

    const filtered = data.items.filter(
      (it) =>
        it.material &&
        !["no material", "assembly", "none"].includes(it.material.toLowerCase())
    );

    return filtered.map((it) => ({
      material: it.material_label,
      mass_kg: Number((it.mass_kg ?? 0).toFixed(6)),
      carbon_kgco2e: Number((it.carbon_kgco2e ?? 0).toFixed(6)),
    }));
  }, [data]);

  const colors = ['#000000', '#404040', '#808080'];
  const handlePrint = async () => {
    window.print();
    await logUsageEvent("LCA REPORT", "Print an LCA Report", { note: "report fetch success" });
  }
  const handleCSV = async () => {

    if (!data) return;
    // 컬럼: material, mass_kg, ef_kgco2e_perkg, carbon_kgco2e, carbon_share(%)
    const totalC = data.totals.carbon_kgco2e || 0;
    const rows = [
      ["material", "mass_kg", "ef_kgco2e_perkg", "carbon_kgco2e", "carbon_share_percent"],
      ...data.items.map((it) => [
        it.material_label,
        (it.mass_kg ?? 0).toFixed(6),
        (it.ef_kgco2e_perkg ?? 0).toFixed(6),
        (it.carbon_kgco2e ?? 0).toFixed(6),
        totalC ? ((it.carbon_kgco2e ?? 0) / totalC * 100).toFixed(2) : "0.00",
      ]),
      ["TOTAL", data.totals.mass_kg.toFixed(6), "-", data.totals.carbon_kgco2e.toFixed(6), "100.00"],
    ];
    const csv = rows.map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `lca_material_carbon_${tableId}.csv`;
    a.click();
    URL.revokeObjectURL(url);

    await logUsageEvent("LCA REPORT", "Export an LCA Report export to File type csv", { note: "report fetch success" });
  };

  const handleBack = async () => {
    await logUsageEvent("STAGE Change", "Get back to Product review stage", { note: "Product review stage" });
    router.push(`/treetable/${tableId}/Product_Review_Stage`);
  };

  if (loading) return <div style={{ padding: 16 }}>로딩중…</div>;
  if (err) return <div style={{ padding: 16, color: "red" }}>에러: {err}</div>;
  if (!data) return <div style={{ padding: 16 }}>데이터 없음</div>;

  return (
    <div style={{ maxWidth: 1100, margin: "0 auto", padding: 16 }}>
      <header style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", borderBottom: "1px solid #eee", paddingBottom: 12 }}>
        <div>
          <h1 style={{ margin: 0 }}>LCA 탄소 리포트</h1>
          <div style={{ color: "#666", fontSize: 13 }}>
            Table ID: <code>{data.tableId}</code>
            {" · 총중량 "} <b>{data.totals.mass_kg.toFixed(6)} kg</b>
            {" · 총탄소 "} <b>{data.totals.carbon_kgco2e.toFixed(6)} kgCO₂e</b>
          </div>
        </div>
        <div className="print-hide" style={{ display: "flex", gap: 8 }}>
          <button onClick={handleBack}>이전으로</button>
          <button onClick={handleCSV}>CSV</button>
          <button onClick={handlePrint}>인쇄/PDF</button>
        </div>
      </header>

      <div ref={chartRef} style={{ display: "grid", gap: 16, gridTemplateColumns: "1fr 1fr", marginTop: 16 }}>
        <div style={{ border: "1px solid #eee", borderRadius: 12, padding: 12 }}>
          <h3 style={{ marginTop: 0 }}>재질별 탄소 비중 (파이)</h3>
          <PieChart width={460} height={340}>
            <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={120} label>
              {pieData.map((_e, i) => <Cell key={i} />)}
            </Pie>
            <ReTooltip
              formatter={(value: number, name: string, props: Payload<number, string>) => {
                const payload = props.payload as { pct: number; name: string; value: number };
                return [`${value} kgCO₂e (${payload.pct.toFixed(2)}%)`, payload.name];
              }}
            />
            <Legend />
          </PieChart>
        </div>

        <div style={{ border: "1px solid #eee", borderRadius: 12, padding: 12 }}>
          <h3 style={{ marginTop: 0 }}>재질별 중량/탄소 (막대)</h3>
          <BarChart width={520} height={340} data={barData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="material" />
            <YAxis />
            <ReTooltip formatter={(v: number, n: string) => {
              return n === "중량(kg)" ? [`${v} kg`, "중량"] : [`${v} kgCO₂e`, "탄소"];
            }} />
            <Legend />

            <Bar dataKey="mass_kg" name="중량(kg)">
              {barData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />
              ))}
            </Bar>
            <Bar dataKey="carbon_kgco2e" name="탄소(kgCO₂e)">
              {barData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />
              ))}
            </Bar>
          </BarChart>
        </div>
      </div>

      <section style={{ border: "1px solid #eee", borderRadius: 12, padding: 12, marginTop: 16 }}>
        <h3 style={{ marginTop: 0 }}>해석 노트</h3>
        <ul style={{ marginTop: 8 }}>
          <li>재질별 탄소(kgCO₂e)는 <code>총질량(kg) × 배출계수(kgCO₂e/kg)</code>로 계산.</li>
          <li>엄밀한 LCA에는 공정/에너지/수송 등 LCI 매핑이 추가로 필요.</li>
          <li>필요 시 어셈블리/그룹 단위 비교(베이스라인 vs 개선안)로 확장 가능.</li>
        </ul>
      </section>

      <style jsx>{`
        .print-hide { display: flex; }
        @media print {
          .print-hide { display: none !important; }
          body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
        }
        button {
          padding: 8px 12px;
          border-radius: 8px;
          border: 1px solid #ddd;
          background: #f7f7f7;
          cursor: pointer;
        }
      `}</style>
    </div>
  );
}
