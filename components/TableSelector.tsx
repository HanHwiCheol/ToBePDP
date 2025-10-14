// components/TableSelector.tsx
// 테이블 선택 컴포넌트
import React from "react";
import { selectBox, btnPrimary, btnDefault, btnDanger } from "../styles"; // 스타일 import

interface TableSelectorProps {
  items: { id: string; name: string; updated_at: string }[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onOpen: () => void;
  onCreate: () => void;
  onDelete: () => void;
}

const TableSelector: React.FC<TableSelectorProps> = ({
  items,
  selectedId,
  onSelect,
  onOpen,
  onCreate,
  onDelete
}) => {
  return (
    <>
      <h2 style={{ marginBottom: 12 }}>BOM Table 선택</h2>
      <select
        value={selectedId ?? ""}
        onChange={(e) => onSelect(e.target.value)}
        style={selectBox}
      >
        {items.map((t) => (
          <option value={t.id} key={t.id}>
            {t.name} — {new Date(t.updated_at).toLocaleString()}
          </option>
        ))}
      </select>

      <div
        style={{
          display: "flex",
          gap: 8,
          marginTop: 12,
          justifyContent: "center",
        }}
      >
        <button onClick={onOpen} style={btnPrimary}>
          열기
        </button>
        <button onClick={onCreate} style={btnDefault}>
          신규 생성
        </button>
        <button onClick={onDelete} style={btnDanger} disabled={!selectedId}>
          삭제
        </button>
      </div>
    </>
  );
};

export default TableSelector;