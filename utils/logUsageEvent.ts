import { supabase } from "@/lib/supabaseClient";
import { useRouter } from "next/router";

// 로그 기록 함수
export const logUsageEvent = async (step: string, action: string, detail: object) => {
  const t0 = performance.now();

  try {
    const { data: s } = await supabase.auth.getSession();
    const uid = s?.session?.user?.id ?? null;
    const email = s?.session?.user?.email ?? null;
    await supabase.from("usage_events").insert([{
      user_id: uid,
      user_email: email,
      step,
      action,
      duration_ms: Math.round(performance.now() - t0),
      detail,
    }]);
  } catch (e: any) {
    console.error("Error logging usage event:", e?.message ?? e);
  }
};
