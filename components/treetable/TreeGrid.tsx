import { CSSProperties } from "react";
import { Material, NodeRow } from "@/types/treetable";
import { indentStyle } from "@/utils/tree";

const formatDate = (v?: string | null) =>
  v
    ? new Date(v).toLocaleString("ko-KR", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    })
    : "-";

export function TreeGrid({
  rows,
  onChangeCell,
  materials,
}: {
  rows: NodeRow[];
  onChangeCell: (idx: number, key: keyof NodeRow, value: string | number | null) => void;
  materials: Material[];
}) {

  // 재질명으로 EF(kgCO2e/kg) 찾기
  const getEf = (materialName?: string | null): number => {
    if (!materialName) return 0;

    const m = materials.find((x) =>
      (x.label ?? "")
        .toLowerCase()
        .includes(materialName.toLowerCase())
    );

    if (!m) return 0;

    return (
      m.emission_factor ??
      0
    );
  };

  // 라인별 탄소(kgCO₂e) = total_mass_kg × EF
  const carbonByIndex = rows.map((r) => {
    const mass = Number(r.total_mass_kg ?? 0);
    const ef = getEf(r.material ?? "");
    return mass * ef;
  });

  // 🔥 탄소배출 Top3 값 구하기
  const sorted = [...carbonByIndex]
    .filter((v) => v > 0)          // 0 이상만
    .sort((a, b) => b - a);        // 내림차순 정렬

  const top1 = sorted[0] ?? 0;     // 1등
  const top2 = sorted[1] ?? 0;     // 2등
  const top3 = sorted[2] ?? 0;     // 3등

  // 각 등수별 배경색 반환
  const getRowBackground = (value: number): string | undefined => {
    if (value <= 0) return undefined;
    if (value === top1) return "#f97373"; // 1등: 진한 빨강
    if (value === top2) return "#fb923c"; // 2등: 주황
    if (value === top3) return "#facc15"; // 3등: 노랑
    return undefined;
  };

  return (
    <div style={wrap}>
      <table style={table}>
        {/* ✅ 고정 컬럼폭 지정 */}
        <colgroup>
          <col style={{ width: 80 }} /> {/* 라인번호 */}
          <col style={{ width: 140 }} /> {/* 품번 */}
          <col style={{ width: 40 }} />  {/* 리비전 */}
          <col style={{ width: 150 }} /> {/* 이름 */}
          <col style={{ width: 140 }} /> {/* 생성일 */}
          <col style={{ width: 140 }} /> {/* 수정일 */}
          <col style={{ width: 70 }} /> {/* 재질 */}
          <col style={{ width: 40 }} /> {/* 수량 */}
          <col style={{ width: 40 }} />  {/* 단위 */}
          <col style={{ width: 80 }} /> {/* 질량(kg) */}
          <col style={{ width: 80 }} /> {/* 탄소(kgCO₂e) */}
        </colgroup>
        <thead style={thead}>
          <tr>
            <th>No</th>
            <th>P/N</th>
            <th>Rev</th>
            <th>Name</th>
            <th>Create Date</th>
            <th>Modify Date</th>
            <th>Material</th>
            <th>QTY</th>
            <th>Unit</th>
            <th>Total Mass(kg)</th>
            <th>Total Carbon(kgCO₂e)</th>
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr>
              <td colSpan={12} style={emptyCell}>
                데이터가 없습니다. 엑셀을 Import 하세요.
              </td>
            </tr>
          ) : (
            rows.map((r, idx) => (
              <tr
                key={r._tmpId ?? r.id ?? idx}
                style={{
                  ...rowStyle,
                  ...(getRowBackground(carbonByIndex[idx])
                    ? { background: getRowBackground(carbonByIndex[idx])! }
                    : {}),
                }}
              >
                {/* 라인번호 */}
                <td>
                  <input
                    value={r.line_no ?? ""}
                    onChange={(e) => onChangeCell(idx, "line_no", e.target.value)}
                    style={{ ...cellInput, ...indentStyle(r._level) }}
                    placeholder="1 · 1.1 · 2 …"
                  />
                </td>
                {/* 품번 */}
                <td>
                  <input
                    value={r.part_no ?? ""}
                    onChange={(e) => onChangeCell(idx, "part_no", e.target.value)}
                    style={cellInput}
                  />
                </td>
                {/* 리비전 */}
                <td>
                  <input
                    value={r.revision ?? ""}
                    onChange={(e) => onChangeCell(idx, "revision", e.target.value)}
                    style={cellInput}
                  />
                </td>
                {/* 이름 */}
                <td>
                  <input
                    value={r.name ?? ""}
                    onChange={(e) => onChangeCell(idx, "name", e.target.value)}
                    style={cellInput}
                  />
                </td>
                {/* 생성일 */}
                <td>
                  <div style={cellInput}>{formatDate(r.created_at)}</div>
                </td>
                {/* 수정일 */}
                <td>
                  <div style={cellInput}>{formatDate(r.updated_at)}</div>
                </td>
                {/* 재질 */}
                <td>
                  <input
                    type="text"
                    value={r.material ?? ""}
                    onChange={(e) => onChangeCell(idx, "material", e.target.value)}
                    style={{
                      ...selectBox,
                      border: "none",
                      background: "transparent",
                      width: "100%",
                    }}
                    placeholder="미입력"
                  />
                </td>
                {/* 수량 */}
                <td>
                  <input
                    type="number"
                    step="0.000001"
                    value={r.qty ?? ""}
                    onChange={(e) => onChangeCell(idx, "qty", e.target.value === "" ? null : Number(e.target.value))}
                    style={cellInput}
                    placeholder="예: 2"
                  />
                </td>
                {/* 단위 */}
                <td>
                  <select
                    value={r.qty_uom ?? "ea"}
                    onChange={(e) => onChangeCell(idx, "qty_uom", e.target.value)}
                    style={selectBox}
                  >
                    <option value="ea">ea</option>
                    <option value="kg">kg</option>
                    <option value="g">g</option>
                    <option value="lb">lb</option>
                  </select>
                </td>
                {/* 질량(kg) - 읽기전용 */}
                <td>
                  <div style={cellReadonly}>
                    {r.total_mass_kg != null ? Number(r.total_mass_kg).toFixed(6) : ""}
                  </div>
                </td>
                {/* 탄소(kgCO₂e) - 읽기전용: total_mass_kg × EF */}
                <td>
                  <div style={cellReadonly}>
                    {(() => {
                      const mass = Number(r.total_mass_kg ?? 0);
                      const ef = getEf(r.material ?? "");
                      const carbon = mass * ef;
                      return carbon > 0 ? carbon.toFixed(6) : "";
                    })()}
                  </div>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}

/* ===== 스타일 ===== */
const wrap: CSSProperties = {
  overflowX: "auto",
  marginTop: 12,
  borderRadius: 12,
  boxShadow: "0 8px 28px rgba(0,0,0,0.06)",
};

const table: CSSProperties = {
  width: "100%",
  tableLayout: "fixed",          // ✅ 셀 폭 고정
  borderCollapse: "separate",
  borderSpacing: 0,
  background: "white",
  border: "1px solid #e5e7eb",
  borderRadius: 12,
  overflow: "hidden",
  fontSize: 12,
  lineHeight: 1.4,
  padding: "0 12px", // ← 좌우 여백 추가 (12~16px 정도가 적당)
};

const thead: CSSProperties = {
  position: "sticky",
  top: 0,
  zIndex: 1,
  background: "#f9fafb",
  boxShadow: "inset 0 -1px 0 #e5e7eb",
};

const emptyCell: CSSProperties = {
  textAlign: "center",
  padding: 28,
  color: "#6b7280",
};

const rowStyle: CSSProperties = {
  borderBottom: "1px solid #f1f5f9",
};

const cellBase: CSSProperties = {
  height: 36,                    // ✅ 행 높이 통일
  display: "flex",
  alignItems: "center",
  width: "100%",
  border: "1px solid #e5e7eb",
  borderRadius: 8,
  padding: "6px 8px",
  fontSize: 12,
  background: "white",
};

const cellInput: CSSProperties = {
  ...cellBase,
  outline: "none",
  boxSizing: "border-box",
} as CSSProperties;

const cellReadonly: CSSProperties = {
  ...cellBase,
  background: "#f9fafb",
  color: "#111827",
  boxSizing: "border-box",
  whiteSpace: "nowrap",          // ✅ 날짜 줄바꿈 방지
} as CSSProperties;

const selectBox: CSSProperties = {
  ...cellBase,
  appearance: "none",
} as CSSProperties;
