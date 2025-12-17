import { useRouter } from "next/router";
import { useScenarioStore } from "@/hooks/useScenarioStore";   // ★ 추가

export default function ScenarioSelectPage() {
  const router = useRouter();
  const setScenario = useScenarioStore((s) => s.setScenario); // ★ store 가져오기

  const handleSelect = (scenario: string) => {
    setScenario(scenario);               // ★ 전역 저장
    router.push(`/scenario/${scenario}`); // 기존 네 flow 유지
  };

  return (
    <div style={{ maxWidth: 600, margin: "80px auto", padding: 32 }}>
      <h1 style={{ fontSize: 24, fontWeight: "bold", marginBottom: 24 }}>
        Select a Scenario
      </h1>

      <button style={btn} onClick={() => handleSelect("material-change")}>
        Material Change Scenario
      </button>

      <button style={btn} onClick={() => handleSelect("size-change")}>
        Size Change Scenario
      </button>

      <button style={btn} onClick={() => handleSelect("structure-change")}>
        BOM Structure Change Scenario
      </button>
    </div>
  );
}

const btn: React.CSSProperties = {
  width: "100%",
  padding: "14px 20px",
  background: "#2563eb",
  color: "white",
  borderRadius: 8,
  marginBottom: 16,
  border: "none",
  cursor: "pointer",
  fontSize: 16,
  fontWeight: 600,
};
