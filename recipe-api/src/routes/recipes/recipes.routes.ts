import { createRoute, z } from "@hono/zod-openapi";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { jsonContent, jsonContentRequired } from "stoker/openapi/helpers";
import { ingredients, recipe_ingredients, recipes } from "../../db/schema";
import { createErrorSchema, IdParamsSchema } from "stoker/openapi/schemas";
import { notFoundSchema } from "../../lib/contants";

const recipeSchema = createSelectSchema(recipes);
const insertRecipeSchema = createInsertSchema(recipes);
const patchRecipesSchema = insertRecipeSchema.partial();

const recipeIngredientInputSchema = createInsertSchema(recipe_ingredients).pick(
  {
    ingredientId: true,
    quantity: true,
    unit: true,
    notes: true,
  },
);

const recipeIngredientResponseSchema = createSelectSchema(ingredients)
  .pick({ id: true, name: true, baseUnit: true })
  .merge(
    createSelectSchema(recipe_ingredients).pick({
      quantity: true,
      unit: true,
      notes: true,
    }),
  );

const recipeResponseSchema = recipeSchema.extend({
  ingredients: recipeIngredientResponseSchema.array(),
});

const createRecipeWithIngredientsSchema = insertRecipeSchema.extend({
  ingredients: recipeIngredientInputSchema.array().optional(),
});

const optionalQueryString = z
  .string()
  .optional()
  .transform((v) => (v === "" ? undefined : v));

const filterQuerySchema = createSelectSchema(recipes)
  .pick({
    difficulty: true,
    type: true,
    category: true,
  })
  .partial()
  .extend({
    healthScore: z.preprocess(
      (v) => (v === "" || v === undefined ? undefined : v),
      z.coerce.number().optional(),
    ),
    name: optionalQueryString,
    ingredientName: optionalQueryString,
  });

export const list = createRoute({
  path: "/recipes",
  method: "get",
  request: {
    query: filterQuerySchema,
  },
  responses: {
    200: jsonContent(recipeResponseSchema.array(), "List of recipes"),
    400: jsonContent(
      createErrorSchema(filterQuerySchema),
      "Invalid query parameter(s)",
    ),
  },
});

export const listOne = createRoute({
  path: "/recipes/{id}",
  method: "get",
  request: {
    params: IdParamsSchema,
  },
  responses: {
    200: jsonContent(recipeResponseSchema, "Recipe for given id"),
    404: jsonContent(notFoundSchema, "recipe not found"),
    400: jsonContent(createErrorSchema(IdParamsSchema), "invalid id error"),
  },
});

export const create = createRoute({
  path: "/recipes",
  method: "post",
  request: {
    body: jsonContentRequired(
      createRecipeWithIngredientsSchema,
      "The recipe to create",
    ),
  },
  responses: {
    200: jsonContent(recipeResponseSchema, "Created recipe"),
    400: jsonContent(
      createErrorSchema(createRecipeWithIngredientsSchema),
      "validation Error(s)",
    ),
    404: jsonContent(notFoundSchema, "ingredient not found"),
  },
});

export const remove = createRoute({
  path: "/recipes/{id}",
  method: "delete",
  request: {
    params: IdParamsSchema,
  },
  responses: {
    200: {
      description: "recipe deleted",
    },
    404: jsonContent(notFoundSchema, "recipe not found"),
    400: jsonContent(createErrorSchema(IdParamsSchema), "invalid id error"),
  },
});

export const patch = createRoute({
  path: "/recipes/{id}",
  method: "patch",
  request: {
    params: IdParamsSchema,
    body: jsonContentRequired(patchRecipesSchema, "The task updates"),
  },
  responses: {
    [200]: jsonContent(recipeSchema, "The updated recipe"),
    [404]: jsonContent(notFoundSchema, "recipe not found"),
    [400]: jsonContent(
      createErrorSchema(patchRecipesSchema).or(
        createErrorSchema(IdParamsSchema),
      ),
      "The validation error(s)",
    ),
  },
});

export type listRoute = typeof list;
export type ListOne = typeof listOne;
export type Create = typeof create;
export type Remove = typeof remove;
export type Patch = typeof patch;
export type RecipeFilters = z.infer<typeof filterQuerySchema>;
