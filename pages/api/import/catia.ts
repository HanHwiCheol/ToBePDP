import type { NextApiRequest, NextApiResponse } from "next";
import { supabase } from "@/lib/supabaseClient";

type CatiaRow = {
  line_no: string;
  parent_line_no?: string | null;
  part_no?: string | null;
  name?: string | null;
  qty?: number | null;
  qty_uom?: string | null;
  mass_per_ea_kg?: number | null;
  material?: string | null;
  revision?: string | null;
  notes?: string | null;
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    const body = JSON.stringify({ error: "Method Not Allowed" });
    res.setHeader("Content-Type", "application/json");
    res.setHeader("Content-Length", Buffer.byteLength(body));
    return res.status(405).end(body);
  }

  try {
    const { rows, title } = req.body as {
      rows: CatiaRow[];
      title?: string;
    };

    if (!rows || !Array.isArray(rows) || rows.length === 0) {
      const body = JSON.stringify({ error: "rows is required" });
      res.setHeader("Content-Type", "application/json");
      res.setHeader("Content-Length", Buffer.byteLength(body));
      return res.status(400).end(body);
    }

    // 1) treetable 헤더 생성 (기존 웹과 동일하게 RPC 사용)
    const autoName =
      title ?? "CATIA-" + new Date().toISOString().replace(/[:T]/g, "").slice(0, 14);

    const { data, error } = await supabase.rpc("create_treetable", {
      p_name: autoName,
    });

    if (error || !data?.id) {
      const body = JSON.stringify({
        error: "RPC create_treetable failed",
        detail: error?.message,
      });
      res.setHeader("Content-Type", "application/json");
      res.setHeader("Content-Length", Buffer.byteLength(body));
      return res.status(500).end(body);
    }

    const treetableId = data.id as string;

    // 2) line_no / parent_line_no 기반으로 treetable_nodes 순차 insert
    //    line_no → id 매핑 테이블
    const idMap = new Map<string, string>();

    rows.sort((a, b) => {
      return a.line_no.localeCompare(b.line_no, undefined, { numeric: true });
    });

    for (const r of rows) {
      const parentId =
        r.parent_line_no && idMap.has(r.parent_line_no)
          ? idMap.get(r.parent_line_no)!
          : null;

      const payload = {
        treetable_id: treetableId,
        parent_id: parentId,
        line_no: r.line_no ?? null,
        part_no: r.part_no ?? null,
        revision: r.revision ?? null,
        name: r.name ?? null,
        material: r.material ?? null,
        qty: r.qty ?? null,
        qty_uom: r.qty_uom ?? null,
        mass_per_ea_kg: r.mass_per_ea_kg ?? null,
      };

      const { data: inserted, error: insErr } = await supabase
        .from("treetable_nodes")
        .insert(payload)
        .select("id")
        .single();

      if (insErr) {
        const body = JSON.stringify({ error: "insert node failed", detail: insErr.message });
        res.setHeader("Content-Type", "application/json");
        res.setHeader("Content-Length", Buffer.byteLength(body));
        return res.status(500).end(body);
      }

      idMap.set(r.line_no, (inserted as any).id as string);
    }

    // 3) CATIA가 읽기 쉬운 고정 길이 응답 반환
    const body = JSON.stringify({
      ok: true,
      treetable_id: treetableId,
      url: `/treetable/${treetableId}`,
    });

    res.setHeader("Content-Type", "application/json");
    res.setHeader("Content-Length", Buffer.byteLength(body));
    return res.status(200).end(body);
  } catch (err: any) {
    const body = JSON.stringify({ error: err.message ?? String(err) });
    res.setHeader("Content-Type", "application/json");
    res.setHeader("Content-Length", Buffer.byteLength(body));
    return res.status(500).end(body);
  }
}
