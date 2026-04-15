import type { APIRoute } from "astro";
import { json, jsonError } from "../../lib/api";
import { db, ensureDB } from "../../lib/db";
import { parsePositiveId } from "../../lib/validation";

export const prerender = false;

export const GET: APIRoute = async ({ url }) => {
  await ensureDB();

  try {
    const id = parsePositiveId(url.searchParams.get("id"));
    const result = await db.execute({
      sql: "SELECT * FROM food_logs WHERE id = ?",
      args: [id],
    });

    if (result.rows.length === 0) {
      return json({ error: "Not found" }, 404);
    }

    return json(result.rows[0]);
  } catch (error) {
    return jsonError(error);
  }
};
