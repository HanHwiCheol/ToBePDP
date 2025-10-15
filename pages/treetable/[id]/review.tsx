import { useRouter } from "next/router";
import { useState, useEffect } from "react";
import { saveReview, fetchReview } from "@/services/treetableService";
import { logUsageEvent } from "@/utils/logUsageEvent";
import { useMemo } from "react";

interface ReviewItem {
  label: string;
  checked: boolean;
}

const CHECK_ITEMS = [
  "제품 설계 시 탄소배출량이 목표치(기준값) 이내로 유지되도록 설계했는가?",
  "부품 재질(Material)은 저탄소·재활용 가능 소재로 선정되었는가?",
  "표면처리(Surface Treatment)는 유해물질을 사용하지 않고, 환경규제(ROHS/REACH 등)에 부합하는가?",
  "표준품(나사, 체결구, O-ring 등)을 사용하여 불필요한 가공·자원 낭비를 최소화했는가?",
  "형상 변경 또는 재질 변경 시, 리비전 및 데이터(3D·2D·EBOM)가 일관되게 업데이트되었는가?",
  "조립·생산 단계에서 불필요한 공정, 과잉 부품 사용 등 탄소 배출을 유발하는 설계 요소가 없는가?",
  "설계 초기 단계에서 대체 가능한 저탄소 구조나 경량화 설계안을 충분히 검토하였는가?",
  "설계 개념 단계에서 제품의 예상 에너지 소비 및 탄소 배출량 목표치를 설정하였는가?",
  "설계 단계에서 산출된 BOM과 3D 데이터가 LCA 수행에 필요한 입력 정보를 충분히 포함하고 있는가?",
  "제품 구조는 재활용성, 분해 용이성, 수명주기 말기 처리(Lifecycle End)까지 고려하여 설계되었는가?",
];

export default function ReviewPage() {
  const router = useRouter();
  const { id } = router.query as { id?: string };

  const [checked, setChecked] = useState<boolean[]>(
    Array(CHECK_ITEMS.length).fill(false)
  );

  // ✅ 저장된 체크리스트 초기 로드
  useEffect(() => {
    if (!id) return;
    setChecked(Array(CHECK_ITEMS.length).fill(false));

    (async () => {
      try {
        const saved = await fetchReview(id);
        // saved 형태: { items: ReviewItem[] }
        if (saved?.items?.length) {
          const map = CHECK_ITEMS.map(lbl => {
            const hit = saved.items.find((it: ReviewItem) => it.label === lbl);
            return !!hit?.checked;
          });
          setChecked(map);
        }
      } catch (e: unknown) {
        console.error("failed to load review:", e instanceof Error ? e.message : e);
      }
    })();
  }, [id]);

  //모든 체크리스트가 체크되었는지 확인하는 코드
  const allChecked = useMemo(() => checked.every(Boolean), [checked]);

  const toggle = (i: number) =>
    setChecked(prev => {
      const next = [...prev];
      next[i] = !next[i];
      return next;
    });

  const handleNextProcess = async () => {
    if (allChecked == true) {
      await logUsageEvent("STAGE Change", "Going to Testing/Prototype Stage", { note: "Testing/Prototype Stage" });
      router.push(`/treetable/${id}/Testing_Prototype_Stage`);
    }else{
      alert("모든 체크리스트가 검토되지 않았습니다");
    }


  };

  const handleSave = async () => {
    try {
      await saveReview(id!, {
        items: CHECK_ITEMS.map((label, i) => ({ label, checked: checked[i] })),
      });
      await logUsageEvent("CHECK List", "Save Check list", { checkedCount: checked.filter(Boolean).length });
      alert("체크리스트가 저장되었습니다.");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : JSON.stringify(err);
      alert("Check list 저장 중 오류 발생:\n" + msg);
    }
  };

  const handleBack = async () => {
    await logUsageEvent("EBOM", "Get back to EBOM Table", { note: "EBOM Table View" });
    router.push(`/treetable/${id}`);  // 예: 이전 페이지로 돌아가기
  };

  return (
    <div style={{ padding: 16 }}>
      {/* 상단 타이틀 + 버튼 */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
        <h1 style={{ margin: 0 }}>설계 검토 체크리스트</h1>
        <div style={{ display: "flex", gap: 8 }}>
          <button className="btn" onClick={handleSave}>저장하기</button>
          <span style={{ margin: "0 8px" }}>|</span>  {/* 구분자 */}
          <button className="btn" onClick={handleBack} >이전단계</button>
          <button className="btn" onClick={handleNextProcess}>다음 단계</button>
        </div>
      </div>

      {/* 카드형 컨테이너 (기존 UI와 유사한 느낌) */}
      <div style={{
        background: "white",
        borderRadius: 12,
        padding: 16,
        boxShadow: "0 2px 10px rgba(0,0,0,0.06)"
      }}>
        <div style={{ display: "grid", rowGap: 10 }}>
          {CHECK_ITEMS.map((label, i) => (
            <label key={i} style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              padding: "10px 12px",
              border: "1px solid #eee",
              borderRadius: 8
            }}>
              <input
                type="checkbox"
                checked={checked[i]}
                onChange={() => toggle(i)}
              />
              <span>{label}</span>
            </label>
          ))}
        </div>
      </div>

      {/* 간단 스타일 */}
      <style jsx>{`
        .btn {
          padding: 8px 14px;
          border-radius: 10px;
          border: 1px solid #ddd;
          background: #f7f7f7;
          cursor: pointer;
        }
        .btn[disabled] {
          opacity: 0.5;
          cursor: not-allowed;
        }
        .btn.primary {
          background: #111;
          color: #fff;
          border-color: #111;
        }
      `}</style>
    </div>
  );
}
