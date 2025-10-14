import { useRouter } from "next/router";
import { CSSProperties } from "react";
import { logUsageEvent } from "@/utils/logUsageEvent";

const TestingPrototypeStage = () => {
    const router = useRouter();
    const { id } = router.query as { id?: string };

    const handleNext = async () => {

        await logUsageEvent("STAGE Change", "Going to Production / Market launch stage Stage", { note: "Production / Market launch stage Stage" });
        router.push(`/treetable/${id}/Production_Market_launch_stage`);

    };

    const handleBack = async () => {
        await logUsageEvent("STAGE Change", "Get back to Testing/Prototype Stage", { note: "Testing/Prototype Stage" });
        router.push(`/treetable/${id}/review`);
    };

    return (
        <div style={{ textAlign: "center", padding: "20px" }}>
            <h1>Testing/Prototype Stage</h1>
            <div>
                <button style={btnGhost} onClick={handleBack}>이전단계</button>
                <button style={btnGhost} onClick={handleNext}>다음단계</button>
            </div>
        </div>
    );
}

export default TestingPrototypeStage;

const btnGhost: CSSProperties = {
  padding: "10px 16px",
  borderRadius: 12,
  border: "1px solid #e5e7eb",
  background: "white",        // ← 흰색 배경
  color: "#111827",
  fontWeight: 600,
  cursor: "pointer",
};