// pages/scenario/[id].tsx
"use client";

import { useRouter } from "next/router";
import { useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import * as XLSX from "xlsx";

import { supabase } from "@/lib/supabaseClient";
import { rowsFromXlsx } from "@/utils/xlsx";
import { saveAllNodes } from "@/services/treetableService";
import { logUsageEvent } from "@/utils/logUsageEvent";
import { useScenarioStore } from "@/hooks/useScenarioStore";

// 시나리오 slug -> 실제 엑셀 파일명 매핑
const SCENARIO_FILE_MAP: Record<string, string> = {
  "material-change": "material-change.xlsx",      // 시나리오 1
  "size-change": "size-change.xlsx",              // 시나리오 2
  "structure-change": "structure-change.xlsx",          // 시나리오 3
};

export default function ScenarioLoaderPage() {
  const router = useRouter();
  const { id } = router.query; // "material-change" 같은 slug

  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const scenario = useScenarioStore((s) => s.scenario) as
    | "material-change"
    | "size-change"
    | "structure-change";

  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      // router.query 준비 안 되었으면 대기
      if (!id || typeof id !== "string") return;

      try {
        setLoading(true);
        setError(null);

        // 1) 로그인 세션 확인
        const { data: s, error: sErr } = await supabase.auth.getSession();
        if (sErr) throw sErr;
        if (!s.session) {
          router.replace("/login");
          return;
        }
        if (cancelled) return;
        setSession(s.session);

        const scenarioSlug = id;
        const fileName = SCENARIO_FILE_MAP[scenarioSlug];
        if (!fileName) {
          throw new Error(`알 수 없는 시나리오입니다: ${scenarioSlug}`);
        }

        // 2) Supabase RPC로 새 treetable 생성
        const autoName =
          `Scenario-${scenarioSlug}-` +
          new Date().toISOString().slice(0, 19).replace(/[:T]/g, "");

        const { data, error: rpcError } = await supabase.rpc("create_treetable", {
          p_name: autoName,
        });
        if (rpcError) throw rpcError;

        const treetableId = data?.id as string | undefined;
        if (!treetableId) {
          throw new Error("create_treetable 함수에서 ID를 반환하지 않았습니다.");
        }
        if (cancelled) return;

        // 사용 로그
        await logUsageEvent(scenario, "EBOM Table create (scenario)", {
          note: `Create from scenario: ${scenarioSlug}`,
          scenario: scenarioSlug,
          treetable_id: treetableId,
        });

        // 3) 시나리오용 엑셀 파일 로드
        const filePath = `/scenario/${fileName}`; // public/scenario/material.xlsx 이런 경로
        const res = await fetch(filePath);
        if (!res.ok) {
          throw new Error(`시나리오 파일을 불러올 수 없습니다: ${filePath}`);
        }

        const buf = await res.arrayBuffer();
        const wb = XLSX.read(buf, { type: "array" });

        // 4) WorkBook → NodeRow[]
        const rows = rowsFromXlsx(wb, treetableId);

        // 5) treetable_nodes에 저장
        await saveAllNodes(treetableId, rows, "replace");

        // 6) treetable 상세 화면으로 이동
        router.replace(`/treetable/${treetableId}`);
      } catch (e: any) {
        console.error(e);
        if (!cancelled) {
          setError(e?.message ?? "알 수 없는 오류가 발생했습니다.");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    run();

    return () => {
      cancelled = true;
    };
  }, [id, router]);

  if (loading) {
    return (
      <div style={{ padding: 40, textAlign: "center" }}>
        <h3>시나리오 데이터를 불러오는 중입니다...</h3>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ padding: 40, textAlign: "center", color: "red" }}>
        <h3>오류 발생: {error}</h3>
      </div>
    );
  }

  return null;
}
