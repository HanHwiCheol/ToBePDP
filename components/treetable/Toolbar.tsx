"use client";

import { CSSProperties, useCallback } from "react";
import { useRouter } from "next/router";
import { NodeRow } from "@/types/treetable";
import { supabase } from "@/lib/supabaseClient";
import { logUsageEvent } from "@/utils/logUsageEvent";
import { useScenarioStore } from "@/hooks/useScenarioStore";
import { thresholds } from "@/components/lcaThresholds";

import React from "react";

interface ToolbarProps {
  onBack: () => void;
  onSave: () => void;
  saving: boolean;
  importMode: "replace" | "append";
  setImportMode: (m: "replace" | "append") => void;
  onFile: (f: File) => void;
  rows: NodeRow[];
  treetable_id?: string | null;
}

export function Toolbar({
  onBack,
  onSave,
  saving,
  importMode,
  setImportMode,
  onFile,
  rows,
  treetable_id,
}: ToolbarProps) {
  const router = useRouter();
  // To-Be 시스템의 탄소배출량 기준
  const scenario = useScenarioStore.getState().scenario;
  if (!scenario) {
    alert("시나리오 정보가 없습니다. 다시 선택해주세요.");
    return;
  }
  const threshold = thresholds[scenario as keyof typeof thresholds];

  // CATIA 진행 상태 (버튼 라벨/스타일 토글용)
  const [catiaInProgress, setCatiaInProgress] = React.useState(false);

  // 새로고침 후에도 유지되도록 로컬스토리지에서 초기화
  React.useEffect(() => {
    const startedAt = localStorage.getItem("catiaStartAt");
    setCatiaInProgress(!!startedAt);
  }, []);

  const handleCompleteClick = React.useCallback(async () => {
    if (!treetable_id) {
      alert("테이블 ID가 없습니다. 저장 또는 리포트 생성 후 다시 시도하세요.");
      return;
    }

    try {
      // LCAReport와 동일 API로 총탄소 조회
      const r = await fetch(`/api/reports/${encodeURIComponent(treetable_id)}`, { cache: "no-store" });
      if (!r.ok) throw new Error(await r.text());
      const data = await r.json() as { totals?: { carbon_kgco2e?: number } };
      const total = Number(data?.totals?.carbon_kgco2e ?? 0);

     // 최신 threshold 사용
      const lower = threshold * 0.9;
      const upper = threshold * 1.1;

      if (total < lower || total > upper) {
        alert(
          `총 탄소: ${total.toFixed(6)} kgCO₂e\n` +
          `→ 탄소 목표량 (` + threshold + `kgCO₂e)의 100 ~ 90% 범위를 벗어났습니다. 완료할 수 없습니다.`
        );
        return;
      }

      // 통과: 완료 처리 (로그 + 완료표시)
      await logUsageEvent(scenario ?? "unknown", "Complete EBOM test", {
        tableId: treetable_id,
        total_carbon_kgco2e: Number(total.toFixed(6)),
        threshold_kgco2e: threshold
      });

      // 선택: 완료 플래그 (원한다면 후속 화면 전환 또는 편집잠금 로직과 연동)
      localStorage.setItem(`ebomComplete:${treetable_id}`, new Date().toISOString());
      alert("완료되었습니다. 다른 시나리오로 이동합니다.");
      // ⭐ 여기 추가 → 완료 후 시나리오 선택 페이지로 이동
      router.push("/scenario");

    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      alert("완료 검증 중 오류: " + msg);
    }
  }, [treetable_id]);

  // 저장 로깅 핸들러 (useCallback 적용)
  const handleSaveClick = useCallback(async () => {
    const t0 = performance.now();
    let ok = false;
    let errMsg: string | null = null;
    try {
      await onSave();     // 원래 저장 실행
      ok = true;

      // 저장 완료 후 이벤트 트리거
      if (treetable_id) {
        window.dispatchEvent(new CustomEvent("ebom:saved", { detail: { treetable_id } }));
      }
    } catch (e: unknown) {
      if (e instanceof Error)
        errMsg = e?.message ?? String(e);
    } finally {
      // usage_events 로깅
      if (treetable_id) {
        const { data: s } = await supabase.auth.getSession();
        const uid = s?.session?.user?.id ?? null;
        const email = s?.session?.user?.email ?? null;

        await logUsageEvent(scenario ?? "unknown", "EBOM Save", { note: "EBOM Table Save to DB" });

        if (!ok) {
          alert(errMsg ?? "저장 중 오류");
        }
      }
    }
  }, [onSave, rows, treetable_id]);


  // Toolbar 컴포넌트 내부에 추가
  const handleNextStepClick = async () => {
    const t0 = performance.now();

    try {
      const { data: s } = await supabase.auth.getSession();
      const uid = s?.session?.user?.id ?? null;
      const email = s?.session?.user?.email ?? null;

      // ✅ 로그 기록
      await supabase.from("usage_events").insert([{
        user_id: uid,
        user_email: email,
        treetable_id,                     // DB 컬럼은 snake_case로!
        step: "REVIEW",
        action: "Starting the EBOM data review.",
        duration_ms: Math.round(performance.now() - t0),
        detail: { note: "User moved to review page from BOM table" },
      }]);

      // ✅ 페이지 이동
      router.push(`/treetable/${treetable_id}/review`);
    } catch (err) {
      console.error("usage_events insert 실패:", err);
    }
  };

  // CATIA 작업 시작 핸들러 (useCallback 적용)
  const handleCatiaClick = React.useCallback(async () => {
    const { data: s, error: sErr } = await supabase.auth.getSession();
    if (sErr || !s.session) {
      alert("로그인 세션 없음");
      return;
    }

    // CATIA 작업 시작
    if (!catiaInProgress) {
      const startAt = new Date().toISOString();
      localStorage.setItem("catiaStartAt", startAt);
      await logUsageEvent(scenario ?? "unknown", "Starting CAD work", { source: "CAD", note: "user marked complete", startAt });
      setCatiaInProgress(true);
      alert("CAD 작업이 진행됩니다.");
      return;
    }

    // CATIA 작업 완료
    const startAt = localStorage.getItem("catiaStartAt");
    if (startAt) {
      const doneAt = new Date().toISOString();
      const durationMs = new Date(doneAt).getTime() - new Date(startAt).getTime();
      await logUsageEvent(scenario ?? "unknown", "Completed CAD work", { source: "CAD", note: "user marked complete", startAt, doneAt, durationMs });

      localStorage.removeItem("catiaStartAt"); // 작업 완료 후 localStorage에서 항목 삭제
      setCatiaInProgress(false); // 상태 변경
      alert("CAD 작업이 완료되었습니다.");
    }
  }, [catiaInProgress]);


  // LCA 타겟 작업 시작 핸들러 (useCallback 적용)
  const handleLCATargetClick = async () => {
    await logUsageEvent(scenario ?? "unknown", "Display a LCA Target (Carbon Emission target)", { note: "Start Setting a LCA Target" });
    router.push(`/lca/LcaTargetsPage?treetable_id=${treetable_id}`);
  };

  // 파일 선택 핸들러 (useCallback 적용)
  const handleFileChange = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const input = e.target;
    const file = input.files?.[0];
    if (!file) return;

    // 1) 파일 처리
    await onFile(file);

    // 2) 저장 자동 실행
    // try {
    //   await onSave();
    //   await logUsageEvent("EBOM", "EBOM Save (Auto after Import)", {
    //     note: "Excel import → auto save"
    //   });
    // } catch (err) {
    //   alert("자동 저장 중 오류 발생: " + (err instanceof Error ? err.message : String(err)));
    // }

    // 3) 같은 파일명을 다시 선택해도 onChange가 발생하도록 value 초기화
    input.value = "";
  }, [onFile, onSave]);


  return (
    <div style={bar}>
      {/* 왼쪽: Excel Import */}
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <label style={{ fontWeight: 600 }}>Excel Import</label>
        <select
          value={importMode}
          onChange={(e) => setImportMode(e.target.value as "replace" | "append")}
          style={selectBox}
          title="replace: 기존 행 삭제 후 대체 / append: 뒤에 추가"
        >
          <option value="replace">대체(replace)</option>
          <option value="append">추가(append)</option>
        </select>
        <input
          type="file"
          accept=".xlsx,.xls"
          onChange={handleFileChange}   // ✅ 핸들러 사용
          style={{ border: "1px solid #e5e7eb", padding: 8, borderRadius: 8 }}
        />
      </div>

      {/* 오른쪽: 목록으로 | 저장하기(흰색) | 다음단계(흰색, 조건부 활성화) */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginLeft: "auto", flexShrink: 0 }}>
        <button
          style={{ ...btnCatia, background: catiaInProgress ? "#f59e0b" : "#0052f7", color: "#fff" }}
          className="btn"
          onClick={handleCatiaClick}
        >
          {catiaInProgress ? "CAD 작업 중" : "CAD 작업"}
        </button>
        <span style={{ margin: "0 8px" }}>|</span>  {/* 구분자 */}
        <button onClick={handleCompleteClick} style={btnGhost}>완료</button>
        
      </div>
    </div>
  );
}

const bar: CSSProperties = {
  background: "#fff",
  border: "1px solid #e5e7eb",
  borderRadius: 12,
  padding: 12,
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: 12,
  flexWrap: "nowrap",
  width: "100%",             // ✅ 바 길이 고정
  boxSizing: "border-box",   // ✅ padding/border 포함
};

const selectBox: CSSProperties = {
  border: "1px solid #e5e7eb",
  borderRadius: 8,
  padding: "6px 8px",
  background: "white",
};

const btnGhost: CSSProperties = {
  padding: "10px 16px",
  borderRadius: 12,
  border: "1px solid #e5e7eb",
  background: "white",        // ← 흰색 배경
  color: "#111827",
  fontWeight: 600,
  cursor: "pointer",
};

const btnCatia: CSSProperties = {
  padding: "10px 16px",
  borderRadius: 12,
  border: "1px solid #e5e7eb",
  background: "#0052f7ff",
  color: "#ffffffff",
  fontWeight: 600,
  cursor: "pointer",
};

const btnLCA: CSSProperties = {
  padding: "10px 16px",
  borderRadius: 12,
  border: "1px solid #e5e7eb",
  background: "#07f007c7",
  color: "#000000ff",
  fontWeight: 600,
  cursor: "pointer",
};