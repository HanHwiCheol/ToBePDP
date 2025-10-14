import { useRouter } from "next/router";
import { CSSProperties } from "react";
import { logUsageEvent } from "@/utils/logUsageEvent";

const ProductionMarketLaunchStage = () => {
    const router = useRouter();
    const { id } = router.query as { id?: string };

    const handleNext = async () => {
        await logUsageEvent("STAGE Change", "Going to Product review stage", { note: "Product review stage" });
        router.push(`/treetable/${id}/Product_Review_Stage`);
    };

    const handleBack = async () => {
        await logUsageEvent("STAGE Change", "Get back to Production / Market launch stage Stage", { note: "Production / Market launch stage Stage" });
        router.push(`/treetable/${id}/Testing_Prototype_Stage`);
    };

    return (
        <div style={{ textAlign: "center", padding: "20px" }}>
            <h1>Production/Market Launch Stage</h1>
            <div>
                <button style={btnGhost} onClick={handleBack}>이전단계</button>
                <button style={btnGhost} onClick={handleNext}>다음단계</button>
            </div>
        </div>
    );
};

export default ProductionMarketLaunchStage;

const btnGhost: CSSProperties = {
  padding: "10px 16px",
  borderRadius: 12,
  border: "1px solid #e5e7eb",
  background: "white",        // ← 흰색 배경
  color: "#111827",
  fontWeight: 600,
  cursor: "pointer",
};
