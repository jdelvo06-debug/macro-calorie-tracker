import type { APIRoute } from "astro";
import { json, jsonError } from "../../lib/api";
import { db, ensureDB } from "../../lib/db";
import { parseGoalsInput } from "../../lib/validation";

export const prerender = false;

export const GET: APIRoute = async () => {
  await ensureDB();
  try {
    const result = await db.execute("SELECT * FROM goals WHERE id = 1");
    if (result.rows.length === 0) {
      return json({ daily_calories: 2000, protein_pct: 30, carbs_pct: 40, fat_pct: 30, goal_weight: null });
    }
    return json(result.rows[0]);
  } catch (error) {
    return jsonError(error);
  }
};

export const PUT: APIRoute = async ({ request }) => {
  await ensureDB();
  try {
    const { daily_calories, protein_pct, carbs_pct, fat_pct, goal_weight } = parseGoalsInput(await request.json());

    await db.execute({
      sql: `INSERT INTO goals (id, daily_calories, protein_pct, carbs_pct, fat_pct, goal_weight, updated_at)
            VALUES (1, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
            ON CONFLICT(id) DO UPDATE SET
              daily_calories = excluded.daily_calories,
              protein_pct = excluded.protein_pct,
               carbs_pct = excluded.carbs_pct,
               fat_pct = excluded.fat_pct,
               goal_weight = excluded.goal_weight,
               updated_at = CURRENT_TIMESTAMP`,
      args: [daily_calories, protein_pct, carbs_pct, fat_pct, goal_weight],
    });

    return json({ ok: true });
  } catch (error) {
    return jsonError(error);
  }
};
