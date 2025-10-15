// pages/index.tsx
"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { supabase } from "../lib/supabaseClient";
import type { Session } from "@supabase/supabase-js";
import AuthForm from "../components/AuthForm";
import TableSelector from "../components/TableSelector";
import { logUsageEvent } from "@/utils/logUsageEvent";

import {
  
  btnGhost,
  card,
  centerWrap,
  emptyBox
} from "../styles";

type TT = {
  id: string;
  name: string;
  created_at: string;
  updated_at: string;
};

export default function Home() {
  const router = useRouter();
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<TT[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
    });
    const { data: listener } = supabase.auth.onAuthStateChange((_e, s) =>
      setSession(s)
    );
    return () => listener.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    const load = async () => {
      if (!session) {
        setItems([]);
        setLoading(false);
        return;
      }
      setLoading(true);
      const { data, error } = await supabase
        .from("treetables")
        .select("id,name,created_at,updated_at")
        .order("updated_at", { ascending: false });

      if (error) {
        console.error(error);
        setItems([]);
      } else {
        setItems((data ?? []) as TT[]);
        setSelectedId(data?.[0]?.id ?? null);
      }
      setLoading(false);
    };
    load();
  }, [session]);

  const signIn = async (email: string, password: string) => {
    const t0 = performance.now();
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      const session = data?.session;
      const uid = session?.user?.id ?? null;
      const userEmail = session?.user?.email ?? email ?? null;

      // 로그인 성공 / 실패 로그 기록
      await supabase.from("usage_events").insert([{
        user_id: uid,
        user_email: userEmail,
        treetable_id: null,
        step: "LOGIN",
        action: error ? "login_error" : "login Success",
        duration_ms: Math.round(performance.now() - t0),
        detail: error
          ? { message: error.message }
          : { note: "User logged in successfully" }
      }]);

      if (error) {
        alert(error.message);
        return;
      }
      alert("로그인 성공");
    } catch (e: unknown) {
      if (e instanceof Error) {
        alert("로그인 중 오류: " + e.message);
      } else {
        alert("로그인 중 알 수 없는 오류 발생");
      }
    }
  };

  const signOut = async () => {
    const t0 = performance.now();
    try {
      const { data: s } = await supabase.auth.getSession();
      const uid = s?.session?.user?.id ?? null;
      const userEmail = s?.session?.user?.email ?? null;

      // ✅ 로그아웃 전 로그 먼저 기록
      await supabase.from("usage_events").insert([{
        user_id: uid,
        user_email: userEmail,
        treetable_id: null,
        step: "Logout",
        action: "logout Success",
        duration_ms: Math.round(performance.now() - t0),
        detail: { note: "User clicked logout" }
      }]);

      // 로그 남긴 후 실제 로그아웃 수행
      await supabase.auth.signOut();

      alert("로그아웃 완료");
    } catch (e: unknown) {
      console.error("로그아웃 중 오류:", e);
    }
  };


  const handleCreate = async () => {
    const name = prompt("새 TreeTable 이름을 입력:");
    if (!name) return;

    try {
      // 1️⃣ 기존 로직
      const { data, error } = await supabase.rpc("create_treetable", { p_name: name });
      if (error) throw error;
      if (!data) throw new Error("데이터 생성 실패");

      await logUsageEvent("EBOM", "EBOM Table create", { note: "EBOM Table create by user" });
      router.push(`/treetable/${data.id}`);
      // 3️⃣ 다음 페이지 이동
      router.push(`/treetable/${data.id}`);
    } catch (e: unknown) {
      if (e instanceof Error) {
        alert("생성 중 오류: " + (e?.message ?? "unknown"));
      } else {
        alert("생성 중 알 수 없는 오류 발생" );
      }
    }
  };

  const handleOpen = async () => {
    if (!selectedId) return;
    await logUsageEvent("EBOM", "EBOM Table Open", { note: "TreeTable opened by user" });
    router.push(`/treetable/${selectedId}`);
  };

  const handleDelete = async () => {
    if (!selectedId) return;
    const target = items.find((x) => x.id === selectedId);
    const ok = confirm(
      `정말 삭제할까요?\n\n이름: ${target?.name ?? selectedId}\n관련 행(노드)도 함께 삭제됩니다.`
    );
    if (!ok) return;

    try {
      // 1️⃣ 자식(노드) 먼저 삭제 (FK CASCADE가 있으면 생략 가능)
      const { error: nodeErr } = await supabase
        .from("treetable_nodes")
        .delete()
        .eq("treetable_id", selectedId);
      if (nodeErr) throw nodeErr;

      // 2️⃣ 부모(테이블) 삭제
      const { error: tblErr } = await supabase
        .from("treetables")
        .delete()
        .eq("id", selectedId);
      if (tblErr) throw tblErr;

      // 4️⃣ 클라이언트 상태 갱신
      setItems((prev) => {
        const next = prev.filter((x) => x.id !== selectedId);
        setSelectedId(next[0]?.id ?? null);
        return next;
      });

      await logUsageEvent("EBOM", "EBOM Table Delete", { note: "EBOM Table delete by user" });
      alert("삭제되었습니다.");
    } catch (e: unknown) {
      if (e instanceof Error) {
        alert("삭제 중 오류: " + e.message);
      } else {
        alert("삭제 중 알 수 없는 오류 발생");
      }
    };
  };

  const handleSelect = (id: string) => {
    setSelectedId(id);
  };

  // 미로그인 상태
  if (!session) {
    return (
      <div style={centerWrap}>
        <div style={card}>
          <h2>로그인이 필요합니다.</h2>
          <AuthForm onSignIn={signIn} />
        </div>
      </div>
    );
  }

  // 로딩
  if (loading) {
    return (
      <div style={centerWrap}>
        <div style={card}>
          <p>불러오는 중.</p>
        </div>
      </div>
    );
  }

  // 데이터 없음 → 중앙에 “신규 생성” 버튼
  if (items.length === 0) {
    return (
      <div style={centerWrap}>
        <div style={emptyBox}>
          <p>저장된 BOM 테이블이 없습니다.</p>
          <button onClick={handleCreate} style={btnGhost}>
            신규 생성
          </button>
          <button onClick={signOut} style={btnGhost}>
            로그아웃
          </button>
        </div>
      </div>
    );
  }

  // 데이터 있음 → 콤보박스 중앙 표시 + 열기/신규/삭제
  return (
    <div style={centerWrap}>
      <div style={card}>
        <TableSelector
          items={items}
          selectedId={selectedId}
          onSelect={handleSelect}
          onOpen={handleOpen}
          onCreate={handleCreate}
          onDelete={handleDelete}
        />
        <button onClick={signOut} style={btnGhost}>
          로그아웃
        </button>
      </div>
    </div>
  );
}