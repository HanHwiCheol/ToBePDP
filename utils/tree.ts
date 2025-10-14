import { NodeRow } from "@/types/treetable";

export function genTmpId() {
  return "tmp_" + Math.random().toString(36).slice(2, 10);
}

export function indentStyle(level?: number) {
  return { paddingLeft: `${(level ?? 0) * 16}px` };
}

/** 신규행(클라이언트 tmpId 기반) 부모-자식 그룹핑 */
export function groupByParentTmp(rows: NodeRow[]) {
  const map = new Map<string | null, NodeRow[]>();
  rows.forEach((r) => {
    const p =
      typeof r.parent_id === "string" && r.parent_id.startsWith("tmp_")
        ? (r.parent_id as string)
        : (r.parent_id ?? null);
    const key = p ?? null;
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(r);
  });
  return map;
}

/** 선택 행의 서브트리 범위 [start, end] 찾기 */
export function findSubtreeRange(list: NodeRow[], idx: number): [number, number] {
  const baseLevel = list[idx]._level ?? 0;
  let end = idx;
  for (let i = idx + 1; i < list.length; i++) {
    const lv = list[i]._level ?? 0;
    if (lv <= baseLevel) break;
    end = i;
  }
  return [idx, end];
}
