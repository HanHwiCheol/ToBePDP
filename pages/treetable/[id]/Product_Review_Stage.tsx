import { useRouter } from "next/router";
import { CSSProperties } from "react";
import { logUsageEvent } from "@/utils/logUsageEvent";

const ProductReviewStage = () => {
    const router = useRouter();
    const { id } = router.query as { id?: string };

    const handleEnd = async () => {
        const result = window.confirm("제품개발이 모두완료 되었다면 \"확인\" 버튼을 눌러 종료하고 아니라면 \"취소\" 버튼을 누르세요");
        if (result) {
            // 사용자가 "확인" 버튼을 눌렀을 때
            alert("프로세스 종료");
            await logUsageEvent("PROCESS END", "End of Product Development Process", { note: "End of Process" });
        }
    };

    const handleBack = async () => {
        await logUsageEvent("STAGE Change", "Get back to Product review stage", { note: "Product review stage" });
        router.push(`/treetable/${id}/Production_Market_launch_stage`);
    };

    return (
        <div style={{ textAlign: "center", padding: "20px" }}>
            <h1>Product Review Stage</h1>
            <div>
                <button style={btnGhost} onClick={handleBack}>이전단계</button>
                <button style={btnGhost} onClick={handleEnd}>프로세스 종료</button>
            </div>
        </div>
    );
};

export default ProductReviewStage;

const btnGhost: CSSProperties = {
    padding: "10px 16px",
    borderRadius: 12,
    border: "1px solid #e5e7eb",
    background: "white",        // ← 흰색 배경
    color: "#111827",
    fontWeight: 600,
    cursor: "pointer",
};
