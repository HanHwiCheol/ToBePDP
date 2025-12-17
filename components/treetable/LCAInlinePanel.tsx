"use client";

import React, { useMemo } from "react";
import {
    PieChart, Pie, Cell, Tooltip as RTooltip, ResponsiveContainer,
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Legend
} from "recharts";
import { thresholds } from "@/components/lcaThresholds";
import { useScenarioStore } from "@/hooks/useScenarioStore";
import { NodeRow, Material } from "@/types/treetable";

interface Props {
    rows: NodeRow[];
    materials: Material[];
    className?: string;
}

export default function LCAInlinePanel({ rows, materials, className }: Props) {

    // To-Be 시스템의 탄소배출량 기준
    const scenario = useScenarioStore((s) => s.scenario);
    const target = thresholds[scenario as keyof typeof thresholds];

    /** 재질명으로 EF 값 찾기 */
    const getEf = (mat?: string | null): number => {
        if (!mat) return 0;

        const normalized = mat.trim().toLowerCase();

        const m = materials.find((x) =>
            (x.label ?? "").trim().toLowerCase() === normalized
        );

        return m?.emission_factor ?? 0;
    };

    /** ⭐ None / 빈 재질 제거 + 재질별 집계 */
    const summary = useMemo(() => {
        const map: Record<string, { mass: number; carbon: number }> = {};

        rows.forEach((r) => {
            const rawMat = r.material ?? "";
            const mat = rawMat.trim();

            // ❌ None, 빈값, null 다 제외
            if (!mat || mat.toLowerCase() === "none") return;

            const mass = Number(r.total_mass_kg ?? 0);
            const ef = getEf(mat);
            const carbon = mass * ef;

            if (!map[mat]) map[mat] = { mass: 0, carbon: 0 };

            map[mat].mass += mass;
            map[mat].carbon += carbon;
        });

        return map;
    }, [rows, materials]);

    const totalCarbon = Object.values(summary).reduce(
        (sum, v) => sum + v.carbon,
        0
    );

    /** 파이차트 데이터 */
    const pieData = useMemo(() => {
        return Object.keys(summary).map((mat) => ({
            name: mat,
            value: summary[mat].carbon,
            pct: totalCarbon > 0 ? (summary[mat].carbon / totalCarbon) * 100 : 0,
        }));
    }, [summary, totalCarbon]);

    /** 막대차트 데이터 */
    const barData = useMemo(() => {
        return Object.keys(summary).map((mat) => ({
            name: mat,
            mass: summary[mat].mass,
            carbon: summary[mat].carbon,
        }));
    }, [summary]);

    const percent = target > 0 ? (totalCarbon / target) * 100 : 0;

    let status: "초과" | "달성" | "미달";
    if (percent >= 100) status = "초과";
    else if (percent >= 90) status = "달성";
    else status = "미달";

    const COLORS = [
        "#6366F1", "#22C55E", "#F59E0B",
        "#06B6D4", "#A855F7", "#84CC16", "#F97316"
    ];

    return (
        <div className={['rounded-xl border p-4', className].join(' ')}>
            <div style={{ display: 'flex', gap: 20, flexWrap: 'nowrap' }}>

                {/* 파이 */}
                <div style={{ flex: 1 }}>
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
                                    label={(d: any) => d.value.toFixed(4)}
                                >
                                    {pieData.map((_, idx) => (
                                        <Cell key={idx} fill={COLORS[idx % COLORS.length]} />
                                    ))}
                                </Pie>
                                <Legend />
                                <RTooltip formatter={(v: number) => v.toFixed(6)} />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* 막대 */}
                <div style={{ flex: 1 }}>
                    <h3 className="text-lg font-semibold mb-3">재질별 중량/탄소 (막대)</h3>
                    <div style={{ height: 320 }}>
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={barData}>
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis dataKey="name" />
                                <YAxis />
                                <RTooltip />
                                <Bar dataKey="mass" name="중량(kg)">
                                    {barData.map((_, i) => (
                                        <Cell key={`mass-${i}`} fill={COLORS[i % COLORS.length]} />
                                    ))}
                                </Bar>
                                <Bar dataKey="carbon" name="탄소(kgCO₂e)">
                                    {barData.map((_, i) => (
                                        <Cell key={`carbon-${i}`} fill={COLORS[i % COLORS.length]} />
                                    ))}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* 목표 */}
                <div style={{ flex: 0.7, textAlign: "center" }}>
                    <h3 className="font-semibold text-gray-700 mb-1">LCA 목표 달성률</h3>
                    <div
                        style={{
                            fontSize: "3rem",
                            fontWeight: 800,
                            color:
                                status === "초과"
                                    ? "#dc2626"
                                    : status === "달성"
                                        ? "#16a34a"
                                        : "#f59e0b",
                        }}
                    >
                        {status}
                    </div>
                    <p style={{ fontSize: "1.75rem", fontWeight: 700 }}>
                        {percent.toFixed(1)}%
                    </p>

                    <p className="text-sm text-gray-600">
                        현재 배출량 {totalCarbon.toFixed(2)} kgCO₂e<br />
                        목표 {target.toFixed(2)} kgCO₂e
                    </p>
                </div>

            </div>
        </div>
    );
}
