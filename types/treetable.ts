export type NodeRow = {
  // 로컬 표시/편집용
  _tmpId?: string;   // 신규/클라이언트 식별
  _level?: number;   // 들여쓰기 레벨(표시용)
  // DB 컬럼
  id?: string | null;
  treetable_id: string;
  parent_id?: string | null;
  line_no?: string | null;
  part_no?: string | null;
  revision?: string | null;
  name?: string | null;
  material?: string | null;
  qty?: number | null;                 // 수량 또는 질량값
  qty_uom?: string | null;             // 'ea' | 'kg' | 'g' | 'lb' ...
  mass_per_ea_kg?: number | null;      // ea일 때 개당 질량(kg)
  total_mass_kg?: number | null;       // 서버 계산 결과(표시/리포트용)
  /** 레거시 호환(있으면 불러와서 화면에만 보여줄 수 있음) */
  weight?: number | null;
  created_at?: string | null;
  updated_at?: string | null;
};

export type Material = {
  code: string;      // 예: "AL6061"
  label: string;     // 예: "알루미늄 6061"
  category: string;
  weight: number | null;  // (옵션) 재질별 기준 무게
  emission_factor?: number | null;   // ← 추가
};
