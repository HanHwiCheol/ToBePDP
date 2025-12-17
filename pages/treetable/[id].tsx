"use client";
import { useRouter } from "next/router";
import { useState, useEffect } from "react";
import type { Session } from "@supabase/supabase-js";
import * as XLSX from "xlsx";
import { useTreetable } from "@/hooks/useTreetable";
import { Toolbar } from "@/components/treetable/Toolbar";
import { TreeGrid } from "@/components/treetable/TreeGrid";
import { rowsFromXlsx } from "@/utils/xlsx";
import { NodeRow } from "@/types/treetable";
import { supabase } from "@/lib/supabaseClient";
import { logUsageEvent } from "@/utils/logUsageEvent";
import { saveAllNodes } from "@/services/treetableService";
import { useScenarioStore } from "@/hooks/useScenarioStore";
import LCAInlinePanel from "@/components/treetable/LCAInlinePanel";

export default function TreetableDetail() {
  const router = useRouter();
  const [session, setSession] = useState<Session | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) =>
      setSession(s)
    );
    return () => sub.subscription.unsubscribe();
  }, []);

  const { id } = router.query;
  const treetable_id = Array.isArray(id) ? id[0] : id;

  // 시나리오 이름을 가져오지만, treetable에서는 자동 import를 하지 않음
  const scenario = useScenarioStore((s) => s.scenario);

  const {
    materials,            // ✅ 훅에서 받아온다
    rows, setRows,
    loading, saving,
    importMode, setImportMode,
    onChangeCell, save,
  } = useTreetable(treetable_id, { ready: !!session });

  const onFile = async (file: File) => {
    if (!treetable_id) return;
    const buf = await file.arrayBuffer();
    const wb = XLSX.read(buf, { type: "array" });
    const imported = rowsFromXlsx(wb, treetable_id);

    if (importMode === "replace") setRows(imported);
    else setRows((prev) => [...prev, ...imported]);

        // DB 저장
    await saveAllNodes(treetable_id, imported, importMode);

    // 4) treetable 페이지 진입
    router.reload();

    await logUsageEvent(scenario ?? "unknown", "EBOM Table data Import", { note: "EBOM Table data import by user" });
  };

  if (!treetable_id) return null;
  if (loading) {
    return (
      <div style={{ maxWidth: 1200, margin: "40px auto", padding: 16 }}>
        <h2>BOM Table</h2>
        <p>불러오는 중...</p>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 1200, margin: "40px auto", padding: 16 }}>
      <h1 style={{ marginBottom: 12 }}>BOM Table</h1>

      {/* 상단 툴바 */}
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 12 }}>
        {/* 왼쪽: Toolbar (Excel Import + 목록으로 + 저장하기) */}
        <Toolbar
          onBack={() => router.push("/")}
          onSave={save}
          saving={saving}
          importMode={importMode}
          setImportMode={setImportMode}
          onFile={onFile}
          rows={rows as NodeRow[]}
          treetable_id={treetable_id as string}
        />
      </div>


      {/* ✅ 여기: LCA 요약 패널 삽입 (툴바와 테이블 사이) */}
      <div
        style={{
          border: "1px solid #e5e7eb",
          borderRadius: 12,
          padding: 16,
          marginBottom: 12,
          background: "#fff",
        }}
      >
        <LCAInlinePanel rows={rows as NodeRow[]} materials={materials} />
      </div>

      {/* 하단 테이블 */}
      <TreeGrid
        rows={rows as NodeRow[]}
        onChangeCell={onChangeCell}
        materials={materials}
      />
    </div>
  );
}
