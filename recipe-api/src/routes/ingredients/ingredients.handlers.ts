import { RouteHandler } from "@hono/zod-openapi";
import {
  createRoute,
  listOneRoute,
  listRoute,
  patchRoute,
  removeRoute,
} from "./ingredients.routes";

import { db } from "../../db";
import { ingredients } from "../../db/schema";
import { eq } from "drizzle-orm";
export const list: RouteHandler<listRoute> = async (c) => {
  const ingredientlist = await db.select().from(ingredients);
  return c.json(ingredientlist, 200);
};

export const listOne: RouteHandler<listOneRoute> = async (c) => {
  const { id } = c.req.valid("param");
  const ingredient = await db.query.ingredients.findFirst({
    where: eq(ingredients.id, id),
  });
  if (!ingredient) return c.json({ message: "ingredient not found" } , 404);
  return c.json(ingredient, 200);
};

export const create: RouteHandler<createRoute> = async (c) => {
  const ingredient = c.req.valid("json");
  const [inserted] = await db
    .insert(ingredients)
    .values(ingredient)
    .returning();
  return c.json(inserted, 200);
};

export const remove: RouteHandler<removeRoute> = async (c) => {
  const { id } = c.req.valid("param");
  const [deleted] = await db.delete(ingredients).where(eq(ingredients.id, id)).returning();
  if (!deleted) return c.json({ message: "ingredient not found" }, 404);
  return c.body(null, 200);
};

export const patch: RouteHandler<patchRoute> = async (c) => {
  const { id } = c.req.valid("param");
  const updates = c.req.valid("json");

  if (Object.keys(updates).length === 0) {
    return c.json(
      {
        success: false,
        error: {
          issues: [
            {
              code: "custom",
              path: [],
              message: "no updates",
            },
          ],
          name: "ZodError",
        },
      },
      400,
    );
  }

  const [ingredient] = await db
    .update(ingredients)
    .set(updates)
    .where(eq(ingredients.id, id))
    .returning();

  if (!ingredient) {
    return c.json(
      {
        message: "ingredient not found",
      },
      404,
    );
  }

  return c.json(ingredient, 200);
};
