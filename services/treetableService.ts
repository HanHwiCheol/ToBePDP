import { supabase } from "@/lib/supabaseClient";
import { Material, NodeRow } from "@/types/treetable";
import { groupByParentTmp } from "@/utils/tree";

// 스키마 접두사 설정(너 프로젝트에 맞게 true/false)
const USE_APP_SCHEMA = true;
const TBL = {
  materials: USE_APP_SCHEMA ? "materials" : "materials",
  nodes: USE_APP_SCHEMA ? "treetable_nodes" : "treetable_nodes",
};

export async function fetchMaterials(): Promise<Material[]> {
  const { data, error } = await supabase
    .from("materials")
    .select("code,label,category,weight,emission_factor");  // ← 추가
  if (error) throw error;
  return (data ?? []) as Material[];
}

export async function fetchNodes(treetableId: string): Promise<NodeRow[]> {
  const { data, error } = await supabase
    .from(TBL.nodes)
    .select("id,treetable_id,parent_id,line_no,part_no,revision,name,material,qty,qty_uom,mass_per_ea_kg,total_mass_kg,weight,created_at,updated_at")
    .eq("treetable_id", treetableId)
    .order("line_no", { ascending: true });
  if (error) throw error;
  return (data ?? []) as NodeRow[];
}

export async function deleteAllNodes(treetableId: string) {
  const { error } = await supabase
    .from(TBL.nodes)
    .delete()
    .eq("treetable_id", treetableId);
  if (error) throw error;
}

/** 화면에 남지 않은 기존 id 삭제 (개별 삭제 반영용) */
export async function deleteMissingNodes(treetableId: string, remainingIds: string[]) {
  const { data: current, error } = await supabase
    .from(TBL.nodes)
    .select("id")
    .eq("treetable_id", treetableId);
  if (error) throw error;
  const toDelete = (current ?? [])
    .map((r: any) => r.id as string)
    .filter((id) => !remainingIds.includes(id));
  if (toDelete.length === 0) return;
  const { error: delErr } = await supabase.from(TBL.nodes).delete().in("id", toDelete);
  if (delErr) throw delErr;
}

export async function saveReview(treetableId: string, checklist: any) {
  const { data: s } = await supabase.auth.getSession();
  const reviewerId = s.session?.user?.id;
  if (!reviewerId) throw new Error("로그인이 필요합니다.");

  const { error } = await supabase
    .from("treetable_reviews") // ✅ 스키마 포함
    .upsert(
      {
        treetable_id: treetableId,     // ✅ not null
        reviewer_id: reviewerId,       // RLS 정책 통과용
        checklist,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "treetable_id" }   // ✅ 인덱스와 1:1 매칭
    );

  if (error) throw new Error(error.message);
}

export async function fetchReview(treetableId: string): Promise<any | null> {
  const { data, error } = await supabase
    .from("treetable_reviews")
    .select("checklist, updated_at")
    .eq("treetable_id", treetableId)
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error && error.code !== "PGRST116") throw error; // no rows 허용
  return data?.checklist ?? null;
}

/** 신규/수정 저장 (replace 모드: 사전 전체삭제 후 삽입) */
export async function saveAllNodes(
  treetableId: string,
  rows: NodeRow[],
  mode: "replace" | "append"
) {
  if (mode === "replace") await deleteAllNodes(treetableId);

  const newRows = rows.filter((r) => !r.id);
  const oldRows = rows.filter((r) => r.id);

  // 신규: tmpId → DB id 치환을 위한 그룹핑
  const idMap = new Map<string, string>();
  const grouped = groupByParentTmp(newRows);

  async function insertChildren(parentDbId: string | null, parentKey: string | null) {
    const list = grouped.get(parentKey ?? null) || [];
    if (list.length === 0) return;

    const payload = list.map((r) => ({
      treetable_id: treetableId,
      parent_id:
        r.parent_id && typeof r.parent_id === "string" && r.parent_id.startsWith("tmp_")
          ? idMap.get(r.parent_id) ?? null
          : (r.parent_id ?? parentDbId ?? null),
      line_no: r.line_no ?? null,
      part_no: r.part_no ?? null,
      revision: r.revision ?? null,
      name: r.name ?? null,
      material: r.material ?? null,
      qty: r.qty ?? null,
      qty_uom: r.qty_uom ?? null,
      mass_per_ea_kg: r.mass_per_ea_kg ?? null,
      // total_mass_kg는 서버(Trigger/Generated)가 계산 → 저장 X
    }));

    const { data, error } = await supabase
      .from(TBL.nodes)
      .insert(payload)
      .select("id");
    if (error) throw error;

    data!.forEach((inserted: any, i: number) => {
      const tmp = list[i]._tmpId!;
      idMap.set(tmp, inserted.id);
    });

    for (const row of list) {
      await insertChildren(idMap.get(row._tmpId ?? "") ?? null, row._tmpId ?? null);
    }
  }

  await insertChildren(null, null);

  if (oldRows.length > 0) {
    const payload = oldRows.map((r) => ({
      id: r.id!,
      treetable_id: treetableId,
      parent_id: r.parent_id ?? null,
      line_no: r.line_no ?? null,
      part_no: r.part_no ?? null,
      revision: r.revision ?? null,
      name: r.name ?? null,
      material: r.material ?? null,
      weight: r.weight ?? null,
      qty: r.qty ?? null,
      qty_uom: r.qty_uom ?? null,
      mass_per_ea_kg: r.mass_per_ea_kg ?? null,
      created_at: r.created_at ?? null,   // ✅ 추가
      updated_at: r.updated_at ?? null,   // ✅ 추가
    }));
    const { error } = await supabase.from(TBL.nodes).upsert(payload, { onConflict: "id" });
    if (error) throw error;
  }
}
