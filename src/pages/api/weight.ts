import type { APIRoute } from "astro";
import { json, jsonError } from "../../lib/api";
import { db, ensureDB } from "../../lib/db";
import { parsePositiveId, parseWeightDays, parseWeightInput } from "../../lib/validation";

export const prerender = false;

export const GET: APIRoute = async ({ url }) => {
  await ensureDB();

  try {
    const days = parseWeightDays(url.searchParams.get("days"));
    const result = await db.execute({
      sql: "SELECT * FROM weight_entries WHERE date >= date('now', ? || ' days') ORDER BY date ASC",
      args: [`-${days}`],
    });
    return json(result.rows);
  } catch (error) {
    return jsonError(error);
  }
};

export const POST: APIRoute = async ({ request }) => {
  await ensureDB();
  try {
    const { date, weight } = parseWeightInput(await request.json());

    await db.execute({
      sql: `INSERT INTO weight_entries (date, weight) VALUES (?, ?)
            ON CONFLICT(date) DO UPDATE SET weight = excluded.weight`,
      args: [date, weight],
    });

    return json({ ok: true }, 201);
  } catch (error) {
    return jsonError(error);
  }
};

export const DELETE: APIRoute = async ({ url }) => {
  await ensureDB();
  try {
    const id = parsePositiveId(url.searchParams.get("id"));
    const result = await db.execute({ sql: "DELETE FROM weight_entries WHERE id = ?", args: [id] });
    if (result.rowsAffected === 0) {
      return json({ error: "Entry not found." }, 404);
    }
    return json({ ok: true });
  } catch (error) {
    return jsonError(error);
  }
};
