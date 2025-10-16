'use client';
import React, { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import {
    PieChart, Pie, Cell, Tooltip as RTooltip, ResponsiveContainer,
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Legend
} from 'recharts';

type Row = {
    material: string | null;
    material_label: string | null;
    mass_kg: number;
    ef_kgco2e_perkg: number;
    carbon_kgco2e: number;
};


interface Props {
    treetableId: string;
    className?: string;
}

export default function LCAInlinePanel({ treetableId, className }: Props) {
    const [rows, setRows] = useState<Row[]>([]);
    const [loading, setLoading] = useState(true);
    const [err, setErr] = useState<string | null>(null);
    const [refreshTick, setRefreshTick] = useState(0);
    // 🔹 올해 목표치
    const [target, setTarget] = useState<number | null>(null);

    //그래프 색상
    const COLORS = ['#6366F1', '#22C55E', '#F59E0B', '#06B6D4', '#A855F7', '#84CC16', '#F97316'];

    useEffect(() => {
        const onSaved = (e: Event) => {
            const { treetable_id: tid } = (e as CustomEvent).detail || {};
            if (!treetableId || tid === treetableId) {
                setRefreshTick(v => v + 1);   // ✅ 재조회 트리거
            }
        };
        window.addEventListener("ebom:saved", onSaved);
        return () => window.removeEventListener("ebom:saved", onSaved);
    }, [treetableId]);

    // 재질별 집계 불러오기
    useEffect(() => {
        let mounted = true;
        (async () => {
            setLoading(true);
            setErr(null);
            const { data, error } = await supabase
                .from('v_lca_carbon_by_table')
                .select('material, material_label, mass_kg, ef_kgco2e_perkg, carbon_kgco2e')
                .eq('treetable_id', treetableId);

            if (!mounted) return;
            if (error) setErr(error.message);
            else setRows((data ?? []) as Row[]);
            setLoading(false);
        })();
        return () => { mounted = false; };
    }, [treetableId,  refreshTick]);

    // 올해 목표치 불러오기
    useEffect(() => {
        let mounted = true;
        (async () => {
            const year = new Date().getFullYear();
            const { data, error } = await supabase
                .from('lca_targets')
                .select('target_kg_co2e')
                .eq('treetable_id', treetableId)
                .eq('year', year)
                .maybeSingle();

            if (!mounted) return;
            if (!error) setTarget(data?.target_kg_co2e ?? null);
        })();
        return () => { mounted = false; };
    }, [treetableId,  refreshTick]);

    const pieData = useMemo(() => {
        const total = rows.reduce((s, r) => s + (r.carbon_kgco2e ?? 0), 0);
        return rows.map((r) => ({
            name: r.material_label ?? r.material ?? 'Unknown',
            value: Number(r.carbon_kgco2e ?? 0),
            pct: total > 0 ? (Number(r.carbon_kgco2e ?? 0) / total) * 100 : 0,
        }))            // "No Material" 제외 (대소문자 구분 없이)
            .filter(d => d.name.toLowerCase() !== 'no material');
    }, [rows]);

    const barData = useMemo(() => {
        return rows
            // 표시 이름 만들기
            .map((r) => ({
                name: r.material_label ?? r.material ?? 'Unknown',
                mass: Number(r.mass_kg ?? 0),
                carbon: Number(r.carbon_kgco2e ?? 0),
            }))
            // "No Material" 제외 (대소문자 구분 없이)
            .filter(d => d.name.toLowerCase() !== 'no material');
    }, [rows]);

    const totalCarbon = useMemo(() => rows.reduce((sum, r) => sum + Number(r.carbon_kgco2e ?? 0), 0),
        [rows]
    );

    if (loading) {
        return <div className={['rounded-xl border p-4', className].join(' ')}>불러오는 중…</div>;
    }
    if (err) {
        return <div className={['rounded-xl border p-4 text-red-600', className].join(' ')}>{err}</div>;
    }
    if (rows.length === 0) {
        return <div className={['rounded-xl border p-4 text-gray-500', className].join(' ')}>표시할 데이터가 없습니다.</div>;
    }

    return (
        <div className={['rounded-xl border p-4', className].join(' ')}>
            <div
                style={{
                    display: 'flex',
                    flexDirection: 'row',
                    alignItems: 'stretch',
                    justifyContent: 'space-between',
                    gap: 20,
                    flexWrap: 'nowrap',
                }}
            >
                {/* 파이 차트 카드 */}
                <div style={{ flex: 1, ...cardStyle }}>
                    <h3 className="text-lg font-semibold mb-3">재질별 탄소 비중 (파이)</h3>
                    <div style={{ height: 320 }}>
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={pieData}
                                    dataKey="value"
                                    nameKey="name"
                                    cx="50%"
                                    cy="50%"
                                    outerRadius="80%"
                                    label={(d: import('recharts').PieLabelRenderProps) => Number(d.value ?? 0).toFixed(6)}
                                >
                                    {pieData.map((_, idx) => (
                                        <Cell key={idx} fill={COLORS[idx % COLORS.length]} />
                                    ))}
                                </Pie>
                                <Legend />
                                <RTooltip formatter={(v: number) => Number(v).toFixed(6)} />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* 막대 차트 카드 */}
                <div style={{ flex: 1, ...cardStyle }}>
                    <h3 className="text-lg font-semibold mb-3">재질별 중량/탄소 (막대)</h3>
                    <div style={{ height: 320 }}>
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={barData}>
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis dataKey="name" />
                                <YAxis />
                                <RTooltip />
                                <Bar dataKey="mass" name="중량(kg)">
                                    {barData.map((d, i) => (
                                        <Cell key={`mass-${i}`} fill={COLORS[i % COLORS.length]} />
                                    ))}
                                </Bar>
                                <Bar dataKey="carbon" name="탄소(kgCO₂e)">
                                    {barData.map((d, i) => (
                                        <Cell key={`mass-${i}`} fill={COLORS[i % COLORS.length]} />
                                    ))}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* 퍼센트 카드 (기존 스타일 유지, 필요 시 cardStyle 재사용 가능) */}
                {target != null && (
                    <div
                        style={{
                            flex: 0.7,
                            display: 'flex',
                            flexDirection: 'column',
                            justifyContent: 'center',
                            alignItems: 'center',
                            ...cardStyle, // ← 통일
                            textAlign: 'center',
                        }}
                    >
                        <h3 className="font-semibold text-gray-700 mb-1">LCA 목표 달성률</h3>
                        <p
                            className="text-3xl font-bold"
                            style={{ fontSize: '3rem', color: totalCarbon <= target ? '#16a34a' : '#dc2626' }}
                        >
                            {target > 0 ? ((totalCarbon / target) * 100).toFixed(1) : '0.0'}%
                        </p>
                        <p className="text-sm text-gray-600">
                            현재 배출량 {totalCarbon.toFixed(2)} kgCO₂e<br />목표 {target.toFixed(2)} kgCO₂e
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
}

const cardStyle: React.CSSProperties = {
    padding: 16,
    borderRadius: 12,
    background: '#f9fafb',
    border: '1px solid #e5e7eb',
    boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
};
