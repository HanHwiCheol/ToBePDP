"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/router";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "../lib/supabaseClient";
import { logUsageEvent } from "@/utils/logUsageEvent";
import { useScenarioStore } from "@/hooks/useScenarioStore";

export default function Home() {
  const router = useRouter();
  const [session, setSession] = useState<Session | null>(null);
  const [initializing, setInitializing] = useState(true);
  const didInit = useRef(false); // ✅ 중복 실행 방지 가드

  // 로그인 상태 감시
  useEffect(() => {
    let cancelled = false;

    supabase.auth.getSession().then(({ data }) => {
      if (!cancelled) {
        setSession(data.session);
        setInitializing(false);
      }
    });

    const { data: listener } = supabase.auth.onAuthStateChange((_e, s) => {
      // 동일 세션으로 중복 set을 줄이고 싶으면 비교 후 설정
      setSession((prev) => (prev?.access_token === s?.access_token ? prev : s));
    });

    return () => {
      cancelled = true;
      listener.subscription.unsubscribe();
    };
  }, []);

  // 로그인되면 자동 생성 + 이동 (단 한 번만)
  useEffect(() => {
    if (!session) return;
    if (didInit.current) return;         // ✅ 두 번째 실행 차단
    didInit.current = true;
    const scenario = useScenarioStore((s) => s.scenario);
    (async () => {
      try {
        const autoName =
          "Auto-" + new Date().toISOString().slice(0, 19).replace(/[:T]/g, "");

        const { data, error } = await supabase.rpc("create_treetable", {
          p_name: autoName,
        });
        if (error || !data?.id) {
          console.error(error);
          alert("테이블 생성 중 오류");
          return;
        }

        await logUsageEvent(scenario ?? "unknown", "EBOM Table create (auto)", {
          note: "Auto create from login redirect",
        });

        router.replace(`/treetable/${data.id}`);
      } catch (err) {
        console.error(err);
        alert("초기화 중 오류가 발생했습니다.");
      }
    })();
  }, [session]); // ✅ router는 의존성에서 제거

  if (!session && !initializing) {
    router.replace("/login");
    return null;
  }

  return (
    <div style={{ display: "flex", justifyContent: "center", alignItems: "center", height: "100vh", fontSize: "20px", fontWeight: 600 }}>
      초기화 중...
    </div>
  );
}
