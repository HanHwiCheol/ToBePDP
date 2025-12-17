import { useState } from "react";
import { useRouter } from "next/router";
import { supabase } from "@/lib/supabaseClient";
import { logUsageEvent } from "@/utils/logUsageEvent";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setBusy(true);
      setErr(null);
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        setErr(error.message);
        setBusy(false);
        return;
      }

      // 로그
      // await logUsageEvent("START", "USER LOGIN", { note: "System Login" });

      // 로그인 성공 -> scenario로 라우팅
      router.replace("/scenario");
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Unknown error");
      setBusy(false);
    }
  };

  return (
    <div style={{ maxWidth: 360, margin: "10vh auto", padding: 24, border: "1px solid #e5e7eb", borderRadius: 12 }}>
      <h2 style={{ marginTop: 0 }}>To-Be System Login</h2>
      <form onSubmit={onSubmit}>
        <div style={{ display: "grid", gap: 12 }}>
          <input
            type="email" placeholder="이메일"
            value={email} onChange={(e) => setEmail(e.target.value)}
            style={{ padding: "10px 12px", border: "1px solid #e5e7eb", borderRadius: 8 }}
            required
          />
          <input
            type="password" placeholder="비밀번호"
            value={password} onChange={(e) => setPassword(e.target.value)}
            style={{ padding: "10px 12px", border: "1px solid #e5e7eb", borderRadius: 8 }}
            required
          />
          <button
            type="submit" disabled={busy}
            style={{ padding: "10px 12px", borderRadius: 8, border: "1px solid #e5e7eb", background: "#111827", color: "#fff", cursor: "pointer", opacity: busy ? 0.7 : 1 }}
          >
            {busy ? "Logging in..." : "Login"}
          </button>
          {err && <div style={{ color: "#b91c1c" }}>{err}</div>}
        </div>
      </form>
    </div>
  );
}
