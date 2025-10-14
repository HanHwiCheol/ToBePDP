// pages/api/reports/[tableId].ts
import type { NextApiRequest, NextApiResponse } from "next";
import { createClient } from "@supabase/supabase-js";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") return res.status(405).json({ error: "Method Not Allowed" });

  const { tableId } = req.query as { tableId?: string };
  if (!tableId) return res.status(400).json({ error: "tableId is required" });

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { db: { schema: "app" } } // 여기서 스키마 명시
  );
  const { data, error } = await supabase
    .from("v_lca_carbon_by_table")
    .select("material, material_label, mass_kg, ef_kgco2e_perkg, carbon_kgco2e")
    .eq("treetable_id", tableId);

  if (error) return res.status(500).json({ error: error.message });

  const items = (data ?? []).sort((a, b) => (b.carbon_kgco2e ?? 0) - (a.carbon_kgco2e ?? 0));
  const totals = items.reduce(
    (acc, r) => {
      acc.mass_kg += r.mass_kg ?? 0;
      acc.carbon_kgco2e += r.carbon_kgco2e ?? 0;
      return acc;
    },
    { mass_kg: 0, carbon_kgco2e: 0 }
  );
  return res.status(200).json({
    tableId,
    totals,   // { mass_kg, carbon_kgco2e }
    items,    // [{ material, material_label, mass_kg, ef_kgco2e_perkg, carbon_kgco2e }]
  });
}
