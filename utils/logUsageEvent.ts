import { supabase } from "@/lib/supabaseClient";
import { useRouter } from "next/router";

// 로그 기록 함수
export const logUsageEvent = async (step: string, action: string, detail: object) => {
  const t0 = performance.now();

  try {
    const { data: s } = await supabase.auth.getSession();
    const uid = s?.session?.user?.id ?? null;
    const email = s?.session?.user?.email ?? null;

    // "Display LCA report" 이벤트일 경우, iter_idx를 증가시키기 위한 추가 로직
    if (action === "Display LCA report") {
      // 세션과 테이블 기준으로 현재의 iter_idx 값 가져오기
      const { data: previousEvent } = await supabase
        .from("usage_events")
        .select("iter_idx")
        .eq("user_id", uid)
        .order("created_at", { ascending: false })
        .limit(1);

      // `iter_idx` 값을 이전 값에서 +1 증가시킴
      const newIterIdx = previousEvent?.[0]?.iter_idx + 1 || 1; // 없으면 1부터 시작

      // 로그 삽입
      await supabase.from("usage_events").insert([{
        user_id: uid,
        user_email: email,
        step,
        action,
        iter_idx: newIterIdx,
        duration_ms: Math.round(performance.now() - t0),
        detail,
      }]);
    } else {
      // "Display LCA report" 이벤트가 아닌 경우, 가장 최근의 iter_idx 값 그대로 사용
      const { data: previousEvent } = await supabase
        .from("usage_events")
        .select("iter_idx")
        .eq("user_id", uid)
        .order("created_at", { ascending: false })
        .limit(1);

      const currentIterIdx = previousEvent?.[0]?.iter_idx || 1; // 없으면 1부터 시작

      // 로그 삽입
      await supabase.from("usage_events").insert([{
        user_id: uid,
        user_email: email,
        step,
        action,
        iter_idx: currentIterIdx, // 이전 iter_idx 유지
        duration_ms: Math.round(performance.now() - t0),
        detail,
      }]);
    }
  } catch (e: any) {
    console.error("Error logging usage event:", e?.message ?? e);
  }
};
