import { useRouter } from "next/router";
import { CSSProperties } from "react";
import { logUsageEvent } from "@/utils/logUsageEvent";

const ProductReviewStage = () => {
    const router = useRouter();
    const { id } = router.query as { id?: string };

    const handleExportBom = async () => {
        try {
            await logUsageEvent("LCA REPORT", "Display LCA report", { note: "Go to LCA from review page" });
            // 리포트 페이지로 이동
            router.push(`/lca/${id}`);
        } catch (e: unknown) {
            if (e instanceof Error) {
                alert("CA REPORT 표시 중 오류 : " + (e?.message ?? "unknown"))
            } else {
                alert("CA REPORT 표시 중 알 수 없는 오류 발생");
            }
        }
    };

    const handleEnd = async () => {
        const result = window.confirm("탄소배출량이 작년보다 낮아졌다면 \"확인\" 버튼을 눌러 종료하고 아니라면 \"취소\" 버튼을 누르세요");

        if (result) {
            // 사용자가 "확인" 버튼을 눌렀을 때
            alert("프로세스 종료");
            await logUsageEvent("PROCESS END", "End of Product Development Process", { note: "End of Process" });
        } else {
            // 사용자가 "취소" 버튼을 눌렀을 때
            alert("프로세스 종료가 취소되었습니다. BOM Table 단계로 돌아가서 다시 작업해주세요");
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
                <button style={btnGhost} onClick={handleExportBom}>BOM Export & LCA </button>
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
