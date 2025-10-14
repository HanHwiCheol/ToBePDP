import dynamic from "next/dynamic";

const LCAReport = dynamic(() => import("../../components/LCAReport"), { ssr: false });

interface LcaPageProps {
  query: Record<string, string | string[]>; // query의 타입을 구체화
}

export default function LcaPage({ query }: LcaPageProps) {
  // query?.tableId가 배열일 경우 첫 번째 값만 사용
  const tableId = 
    typeof window !== "undefined"
      ? decodeURIComponent(window.location.pathname.split("/").pop() || "")
      : (Array.isArray(query?.tableId) ? query?.tableId[0] : query?.tableId) ?? "";

  return (
    <main>
      <LCAReport tableId={tableId} />
    </main>
  );
}