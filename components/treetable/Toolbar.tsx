import { CSSProperties, useCallback } from "react";
import { useRouter } from "next/router";
import { NodeRow } from "@/types/treetable";
import { supabase } from "@/lib/supabaseClient";
import { logUsageEvent } from "@/utils/logUsageEvent";
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

  // CATIA 진행 상태 (버튼 라벨/스타일 토글용)
  const [catiaInProgress, setCatiaInProgress] = React.useState(false);

  // 새로고침 후에도 유지되도록 로컬스토리지에서 초기화
  React.useEffect(() => {
    const startedAt = localStorage.getItem("catiaStartAt");
    setCatiaInProgress(!!startedAt);
  }, []);

  // ✅ 재질이 모두 선택되었는지 검사 (계산된 값)
  const allMaterialsChosen = React.useMemo(() => {
    return rows.length > 0 && rows.every((r) => !!(r.material && r.material !== ""));
  }, [rows]);

  // 저장 로깅 핸들러 (useCallback 적용)
  const handleSaveClick = useCallback(async () => {
    const t0 = performance.now();
    let ok = false;
    let errMsg: string | null = null;

    try {
      await onSave();      // 실제 저장 (비동기 완료)
      // 저장 성공: LCA 패널들에게 재조회 신호 브로드캐스트
      window.dispatchEvent(new CustomEvent("ebom:saved", { detail: { treetable_id } }));
      ok = true;
    } catch (e: unknown) {
      if (e instanceof Error)
        errMsg = e?.message ?? String(e);
    } finally {
      // usage_events 로깅 (treetable_id 없으면 스킵)
      try {
        const { data: s } = await supabase.auth.getSession();
        const uid = s?.session?.user?.id ?? null;
        const email = s?.session?.user?.email ?? null;

        if (treetable_id) {
          await supabase.from("usage_events").insert([{
            user_id: uid,
            user_email: email,
            treetable_id,
            step: "EBOM",
            action: ok ? "EBOM Save" : "error",
            duration_ms: Math.round(performance.now() - t0),
            detail: ok
              ? { note: "treetable save", rowCount: rows?.length ?? null }
              : { note: "treetable save error", message: errMsg }
          }]);
        }
      } catch (logErr) {
        console.error("usage_events insert 실패:", logErr);
      }
    }

    if (!ok) {
      alert(errMsg ?? "저장 중 오류");
    }
  }, [onSave, rows, treetable_id]);  // Dependencies 명시

  // Toolbar 컴포넌트 내부에 추가
  const handleNextStepClick = async () => {
    if (!rows.length || !allMaterialsChosen) return;

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
    if (sErr || !s.session) { alert("로그인 세션 없음"); return; }

    // 아직 시작 안된 상태 → 시작 처리
    if (!catiaInProgress) {
      const startAt = new Date().toISOString();
      localStorage.setItem("catiaStartAt", startAt);
      await logUsageEvent("CATIA", "Starting CATIA work", { source: "CATIA", note: "user marked complete", startAt });
      setCatiaInProgress(true);
      alert("CATIA 작업이 진행됩니다.");
      return;
    }

    // 이미 진행 중 → 완료 처리
    const startAt = localStorage.getItem("catiaStartAt");
    const doneAt = new Date().toISOString();
    const durationMs = startAt ? (new Date(doneAt).getTime() - new Date(startAt).getTime()) : null;
    await logUsageEvent("CATIA", "Completed CATIA work", { source: "CATIA", note: "user marked complete", startAt, doneAt, durationMs });

    localStorage.removeItem("catiaStartAt");
    setCatiaInProgress(false);
    alert("CATIA 작업이 완료되었습니다.");
  }, [treetable_id, catiaInProgress]);


  // LCA 타겟 작업 시작 핸들러 (useCallback 적용)
  const handleLCATargetClick = async () => {
    await logUsageEvent("LCA TARGET", "Display a LCA Target (Carbon Emission target)", { note: "Start Setting a LCA Target" });
    router.push(`/lca/LcaTargetsPage?treetable_id=${treetable_id}`);
  };

  // 파일 선택 핸들러 (useCallback 적용)
  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) onFile(file);
  }, [onFile]);  // ✅ onFile dependency 추가

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
        <button style={btnLCA} className="btn" onClick={handleLCATargetClick}>LCA 목표</button>
        <button
          style={{ ...btnCatia, background: catiaInProgress ? "#f59e0b" : "#0052f7", color: "#fff" }}
          className="btn"
          onClick={handleCatiaClick}
        >
          {catiaInProgress ? "CATIA 작업 중" : "CATIA 작업"}
        </button>
        <button onClick={handleSaveClick} disabled={saving} style={{ ...btnGhost, opacity: saving ? 0.6 : 1 }}>{saving ? "저장 중..." : "저장하기"}</button>
        <span style={{ margin: "0 8px" }}>|</span>  {/* 구분자 */}
        <button onClick={onBack} style={btnGhost}>이전단계</button>
        <button onClick={handleNextStepClick} disabled={!rows.length || !allMaterialsChosen} style={{ ...btnGhost, opacity: rows.length && allMaterialsChosen ? 1 : 0.5, cursor: rows.length && allMaterialsChosen ? "pointer" : "not-allowed", }}>다음단계</button>
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