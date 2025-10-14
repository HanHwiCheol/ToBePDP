import * as XLSX from "xlsx";
import { NodeRow } from "@/types/treetable";
import { genTmpId } from "./tree";

/** 엑셀 → NodeRow[] (parent_line_no를 이용해 임시 트리 구성) */
export function rowsFromXlsx(wb: XLSX.WorkBook, treetableId: string): NodeRow[] {
  const sheet = wb.Sheets[wb.SheetNames[0]];
  const json = XLSX.utils.sheet_to_json<any>(sheet, { defval: null, raw: true });

  const keyMap = (k: string) => {
    const s = String(k).trim().toLowerCase();
    if (/^line[_\s-]*no$|라인번호/.test(s)) return "line_no";
    if (/^parent[_\s-]*line[_\s-]*no$|부모라인|^parent$/.test(s)) return "parent_line_no";
    if (/^part[_\s-]*no$|품번/.test(s)) return "part_no";
    if (/rev|revision|리비전/.test(s)) return "revision";
    if (/name|이름/.test(s)) return "name";
    if (/material|재질|소재|자재코드/.test(s)) return "material";
    if (/^qty$|수량|quantity/.test(s)) return "qty";
    if (/^qty[_\s-]*uom$|단위|uom/.test(s)) return "qty_uom";
    if (/mass[_\s-]*per[_\s-]*ea|개당질량|mass\/ea|kg\/ea/.test(s)) return "mass_per_ea_kg";
    // 레거시: 총중량이 들어오면 weight로 받아 두고 아래에서 변환
    if (/(^|_)weight$|총중량|중량|무게/.test(s)) return "weight";
    return null;
  };

  const rowsRaw = json.map((r: any) => {
    const out: any = {};
    for (const k of Object.keys(r)) {
      const mapped = keyMap(k);
      if (mapped) out[mapped] = r[k];
    }
    return out;
  });

  const byLine = new Map<string, string>(); // line_no -> tmpId
  const tmpRows: (NodeRow & { parent_line_no?: string | null })[] = rowsRaw.map((r: any) => {
    const tmpId = genTmpId();
    if (r.line_no != null) byLine.set(String(r.line_no), tmpId);
    // 숫자 변환 유틸
    const toNum = (v: any) =>
      v == null || v === "" ? null : Number(String(v).replace(/[, ]/g, ""));
    const parsedQty = toNum(r.qty);
    const parsedMassPerEa = toNum(r.mass_per_ea_kg);
    const parsedWeight = toNum(r.weight); // 레거시 총중량(kg 가정)
    const uom = (r.qty_uom ?? "").toString().trim().toLowerCase() || null;

    return {
      _tmpId: tmpId,
      treetable_id: treetableId,
      parent_id: null,
      line_no: r.line_no ? String(r.line_no) : null,
      part_no: r.part_no ? String(r.part_no) : null,
      revision: r.revision ? String(r.revision) : null,
      name: r.name ? String(r.name) : null,
      //weight: Number.isFinite(parsedWeight as number) ? (parsedWeight as number) : null, // ✅ 추가
      qty: parsedQty,
      qty_uom: uom,
      mass_per_ea_kg: parsedMassPerEa,
      // 레거시 weight만 있고 새 필드가 없을 때 자동 매핑(= ea 1개짜리)
      ...(parsedWeight != null && (parsedQty == null && !uom && parsedMassPerEa == null)
        ? { qty: 1, qty_uom: "ea", mass_per_ea_kg: parsedWeight }
        : {}),
      material: r.material ? String(r.material) : null,
      parent_line_no: r.parent_line_no != null ? String(r.parent_line_no) : null,
    };
  });

  // parent_id (tmpId 기준) 채우기
  tmpRows.forEach((r) => {
    if (r.parent_line_no) {
      const pid = byLine.get(r.parent_line_no);
      if (pid) r.parent_id = pid;
    }
  });

  // ✅ 라인번호 계층 정렬 추가
  tmpRows.sort((a, b) => {
    const ap = String(a.line_no || "").split(".").map(Number);
    const bp = String(b.line_no || "").split(".").map(Number);
    for (let i = 0; i < Math.max(ap.length, bp.length); i++) {
      const av = ap[i] || 0;
      const bv = bp[i] || 0;
      if (av !== bv) return av - bv;
    }
    return 0;
  });

  // level 계산
  const levelMemo = new Map<string, number>();
  const getLevel = (row: NodeRow & { parent_line_no?: string | null }): number => {
    if (!row._tmpId) return 0;
    if (levelMemo.has(row._tmpId)) return levelMemo.get(row._tmpId)!;
    let lv = 0;
    let cur: any = row;
    const visited = new Set<string>();
    while (cur && cur.parent_id && typeof cur.parent_id === "string") {
      if (visited.has(cur._tmpId!)) break;
      visited.add(cur._tmpId!);
      const parent = tmpRows.find((x) => x._tmpId === cur.parent_id);
      if (!parent) break;
      lv++;
      cur = parent;
    }
    levelMemo.set(row._tmpId!, lv);
    return lv;
  };

  const withLevels = tmpRows
    .map((r) => ({ ...r, _level: getLevel(r) }))
    // ✅ line_no가 없는 행 제거
    .filter((r) => r.line_no != null && r.line_no !== "");

  // ✅ 안전한 계층 정렬
  withLevels.sort((a, b) => {
    const lineA = String(a.line_no || "");
    const lineB = String(b.line_no || "");
    const ap = lineA.split(".").map(Number);
    const bp = lineB.split(".").map(Number);
    for (let i = 0; i < Math.max(ap.length, bp.length); i++) {
      const av = ap[i] || 0;
      const bv = bp[i] || 0;
      if (av !== bv) return av - bv;
    }
    return 0;
  });

  return withLevels;
}
