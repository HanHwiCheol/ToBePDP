import { useEffect, useMemo, useState } from "react";
import { Material, NodeRow } from "@/types/treetable";
import { fetchMaterials, fetchNodes, saveAllNodes, deleteMissingNodes } from "@/services/treetableService";

export function useTreetable(treetableId?: string, p0?: { ready: boolean; }) {
  const [materials, setMaterials] = useState<Material[]>([]);
  const [rows, setRows] = useState<NodeRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [importMode, setImportMode] = useState<"replace" | "append">("replace");

  useEffect(() => {
    if (!treetableId) return;
    (async () => {
      setLoading(true);
      try {
        const [mats, nodes] = await Promise.all([
          fetchMaterials(),
          fetchNodes(treetableId),
        ]);
        setMaterials(mats);
        const withLevel = nodes.map((n) => ({
          ...n,
          _tmpId: n.id ?? "tmp_" + Math.random().toString(36).slice(2, 10),
          _level: (n.line_no?.split(".").length ?? 1) - 1,
        }));
        setRows(withLevel);
      } finally {
        setLoading(false);
      }
    })();
  }, [treetableId]);

  const materialOptions = useMemo(
    () => materials.map((m) => ({ value: m.code, label: `${m.label} (${m.code})` })),
    [materials]
  );

  const onChangeCell = (rowIndex: number, key: keyof NodeRow, value: any) => {
    setRows((prev) => {
      const next = [...prev];
      const r = { ...next[rowIndex] };
      (r as any)[key] = value;
      // 미리보기 계산(서버와 동일 로직)
      const uom = (r.qty_uom ?? "").toString().toLowerCase();
      const qty = num(r.qty);
      const mpe = num(r.mass_per_ea_kg);
      const toKg = (val: number | null, unit: string) => {
        if (val == null) return null;
        if (unit === "kg") return val;
        if (unit === "g") return val * 0.001;
        if (unit === "lb") return val * 0.45359237;
        return null; // ea는 여기서 환산 안 함
      };
      if (uom && uom !== "ea") {
        r.total_mass_kg = toKg(qty, uom);
      } else {
        r.total_mass_kg = (qty ?? 0) * (mpe ?? 0);
      }
      next[rowIndex] = r;
      return next;
    });
  };
  
  const save = async () => {
    if (!treetableId) return;
    setSaving(true);
    try {
      // 화면에서 남아있는 기존 id 수집 → 개별 삭제 반영
      const remainIds = rows.filter((r) => r.id).map((r) => r.id!);
      if (importMode !== "replace") {
        await deleteMissingNodes(treetableId, remainIds);
      }
      await saveAllNodes(treetableId, rows, importMode);
      // 저장 후 재조회
      const fresh = await fetchNodes(treetableId);
      setRows(
        fresh.map((n) => ({
          ...n,
          _tmpId: n.id ?? "tmp_" + Math.random().toString(36).slice(2, 10),
          _level: (n.line_no?.split(".").length ?? 1) - 1,
        }))
      );
      alert("저장 완료!");
    } catch (e: any) {
      alert("저장 중 오류 : " + (e?.message ?? "unknown"));
    } finally {
      setSaving(false);
    }
  };

  // 수치 보정 유틸
  const num = (v: any) => (v == null || v === "" ? null : Number(v));



  return {
    materials,
    materialOptions,
    rows,
    setRows,
    loading,
    saving,
    importMode,
    setImportMode,
    onChangeCell,
    save,
  };
}
