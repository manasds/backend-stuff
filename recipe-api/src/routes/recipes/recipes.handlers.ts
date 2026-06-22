import { RouteHandler } from "@hono/zod-openapi";
import {
  Create,
  ListOne,
  listRoute,
  Patch,
  RecipeFilters,
  Remove,
} from "./recipes.routes";
import { db } from "../../db";
import { ingredients, recipe_ingredients, recipes } from "../../db/schema";
import { and, eq, exists, ilike, inArray, SQL } from "drizzle-orm";

function buildRecipeWhere(options: {
  recipeId?: number;
  filters?: RecipeFilters;
}): SQL | undefined {
  const conditions: SQL[] = [];

  if (options.recipeId !== undefined) {
    conditions.push(eq(recipes.id, options.recipeId));
  }
  if (options.filters?.difficulty) {
    conditions.push(eq(recipes.difficulty, options.filters.difficulty));
  }
  if (options.filters?.type) {
    conditions.push(eq(recipes.type, options.filters.type));
  }
  if (options.filters?.category) {
    conditions.push(eq(recipes.category, options.filters.category));
  }
  if (options.filters?.healthScore !== undefined) {
    conditions.push(eq(recipes.healthScore, options.filters.healthScore));
  }
  if (options.filters?.name) {
    conditions.push(ilike(recipes.name, `%${options.filters.name}%`));
  }
  if (options.filters?.ingredientName) {
    conditions.push(
      exists(
        db
          .select({ id: recipe_ingredients.id })
          .from(recipe_ingredients)
          .innerJoin(
            ingredients,
            eq(recipe_ingredients.ingredientId, ingredients.id),
          )
          .where(
            and(
              eq(recipe_ingredients.recipeId, recipes.id),
              ilike(ingredients.name, `%${options.filters.ingredientName}%`),
            ),
          ),
      ),
    );
  }

  if (conditions.length === 0) return undefined;
  return and(...conditions);
}

async function fetchRecipesWithIngredients(options?: {
  recipeId?: number;
  filters?: RecipeFilters;
}) {
  const where = buildRecipeWhere({
    recipeId: options?.recipeId,
    filters: options?.filters,
  });

  const rows = await db.query.recipes.findMany({
    where,
    with: {
      recipeIngredients: {
        with: { ingredient: true },
      },
    },
  });

  return rows.map(({ recipeIngredients, ...recipe }) => ({
    ...recipe,
    ingredients: recipeIngredients.map((ri) => ({
      id: ri.ingredient.id,
      name: ri.ingredient.name,
      baseUnit: ri.ingredient.baseUnit,
      quantity: ri.quantity,
      unit: ri.unit,
      notes: ri.notes,
    })),
  }));
}

export const list: RouteHandler<listRoute> = async (c) => {
  const query = c.req.valid("query");
  const result = await fetchRecipesWithIngredients({ filters: query });
  return c.json(result, 200);
};

export const listOne: RouteHandler<ListOne> = async (c) => {
  const { id } = c.req.valid("param");
  const [recipe] = await fetchRecipesWithIngredients({ recipeId: id });

  if (!recipe) {
    return c.json({ message: "recipe not found" }, 404);
  }

  return c.json(recipe, 200);
};

export const create: RouteHandler<Create> = async (c) => {
  const { ingredients: recipeIngredients, ...recipe } = c.req.valid("json");

  if (recipeIngredients?.length) {
    const ingredientIds = recipeIngredients.map((item) => item.ingredientId);
    const existingIngredients = await db
      .select({ id: ingredients.id })
      .from(ingredients)
      .where(inArray(ingredients.id, ingredientIds));

    if (existingIngredients.length !== ingredientIds.length) {
      return c.json({ message: "ingredient not found" }, 404);
    }
  }

  const insertedRecipe = await db.transaction(async (tx) => {
    const [recipeRow] = await tx.insert(recipes).values(recipe).returning();

    if (recipeIngredients?.length) {
      await tx.insert(recipe_ingredients).values(
        recipeIngredients.map((item) => ({
          recipeId: recipeRow.id,
          ingredientId: item.ingredientId,
          quantity: item.quantity,
          unit: item.unit,
          notes: item.notes,
        })),
      );
    }

    return recipeRow;
  });

  const [result] = await fetchRecipesWithIngredients({
    recipeId: insertedRecipe.id,
  });
  return c.json(result, 200);
};

export const remove: RouteHandler<Remove> = async (c) => {
  const { id } = c.req.valid("param");
  const [deleted] = await db
    .delete(recipes)
    .where(eq(recipes.id, id))
    .returning();
  if (!deleted) return c.json({ message: "recipe not found" }, 404);
  return c.body(null, 200);
};

export const patch: RouteHandler<Patch> = async (c) => {
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

  const [recipe] = await db
    .update(recipes)
    .set(updates)
    .where(eq(recipes.id, id))
    .returning();

  if (!recipe) {
    return c.json({ message: "recipe not found" }, 404);
  }

  return c.json(recipe, 200);
};
