import type { APIRoute } from "astro";
import { json, jsonError } from "../../lib/api";
import { db, ensureDB } from "../../lib/db";
import {
  mergeFoodLogUpdate,
  parseFoodLogCreateInput,
  parseFoodLogListDate,
  parseFoodLogUpdateInput,
  parsePositiveId,
} from "../../lib/validation";
import type { FoodLog } from "../../lib/types";

export const prerender = false;

export const GET: APIRoute = async ({ url }) => {
  await ensureDB();

  try {
    const date = parseFoodLogListDate(url.searchParams.get("date"));
    const result = await db.execute({
      sql: "SELECT * FROM food_logs WHERE date = ? ORDER BY created_at ASC",
      args: [date],
    });
    return json(result.rows);
  } catch (error) {
    return jsonError(error);
  }
};

export const POST: APIRoute = async ({ request }) => {
  await ensureDB();
  try {
    const body = parseFoodLogCreateInput(await request.json());
    const { date, meal_type, food_name, brand, serving_size, servings, calories, protein, carbs, fat, fiber, sugar, sodium, vitamins, barcode } = body;

    const result = await db.execute({
      sql: `INSERT INTO food_logs (date, meal_type, food_name, brand, serving_size, servings, calories, protein, carbs, fat, fiber, sugar, sodium, vitamins, barcode)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [
        date,
        meal_type,
        food_name,
        brand,
        serving_size,
        servings,
        calories,
        protein,
        carbs,
        fat,
        fiber,
        sugar,
        sodium,
        vitamins,
        barcode,
      ],
    });

    return json({ id: Number(result.lastInsertRowid), ok: true }, 201);
  } catch (error) {
    return jsonError(error);
  }
};

export const DELETE: APIRoute = async ({ url }) => {
  await ensureDB();
  try {
    const id = parsePositiveId(url.searchParams.get("id"));
    const result = await db.execute({ sql: "DELETE FROM food_logs WHERE id = ?", args: [id] });
    if (result.rowsAffected === 0) {
      return json({ error: "Entry not found." }, 404);
    }
    return json({ ok: true });
  } catch (error) {
    return jsonError(error);
  }
};

export const PUT: APIRoute = async ({ request }) => {
  await ensureDB();
  try {
    const body = parseFoodLogUpdateInput(await request.json());
    const existing = await db.execute({
      sql: "SELECT * FROM food_logs WHERE id = ?",
      args: [body.id],
    });
    const current = existing.rows[0] as unknown as FoodLog | undefined;

    if (!current) {
      return json({ error: "Not found" }, 404);
    }

    const merged = mergeFoodLogUpdate(current, body);

    await db.execute({
      sql: `UPDATE food_logs
            SET date = ?, meal_type = ?, food_name = ?, brand = ?, serving_size = ?, servings = ?,
                calories = ?, protein = ?, carbs = ?, fat = ?, fiber = ?, sugar = ?, sodium = ?, vitamins = ?, barcode = ?
            WHERE id = ?`,
      args: [
        merged.date,
        merged.meal_type,
        merged.food_name,
        merged.brand,
        merged.serving_size,
        merged.servings,
        merged.calories,
        merged.protein,
        merged.carbs,
        merged.fat,
        merged.fiber,
        merged.sugar,
        merged.sodium,
        merged.vitamins,
        merged.barcode,
        body.id,
      ],
    });

    return json({ ok: true });
  } catch (error) {
    return jsonError(error);
  }
};
