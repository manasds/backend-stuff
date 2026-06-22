import { createRoute } from "@hono/zod-openapi";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { jsonContent, jsonContentRequired } from "stoker/openapi/helpers";
import { ingredients } from "../../db/schema";
import { createErrorSchema, IdParamsSchema } from "stoker/openapi/schemas";
import { notFoundSchema } from "../../lib/contants";

const selectIngredientsSchema = createSelectSchema(ingredients);
const insertIngredientsSchema = createInsertSchema(ingredients);
const patchIngredientsSchema = insertIngredientsSchema.partial();
export const list = createRoute({
  path: "/ingredients",
  method: "get",
  responses: {
    200: jsonContent(selectIngredientsSchema.array(), "list of ingredients"),
  },
});

export const listOne = createRoute({
  path: "/ingredients/{id}",
  method: "get",
  request: {
    params: IdParamsSchema,
  },
  responses: {
    200: jsonContent(selectIngredientsSchema, "requested ingredient"),
    404: jsonContent(notFoundSchema, "ingredient not found"),
    400: jsonContent(createErrorSchema(IdParamsSchema), "invalid id"),
  },
});

export const create = createRoute({
  path: "/ingredients",
  method: "post",
  request: {
    body: jsonContentRequired(
      insertIngredientsSchema,
      "ingredient to be created",
    ),
  },
  responses: {
    200: jsonContent(selectIngredientsSchema, "created ingredient"),
    400: jsonContent(
      createErrorSchema(insertIngredientsSchema),
      "validation Error(s)",
    ),
  },
});

export const remove = createRoute({
  path: "/ingredients/{id}",
  method: "delete",
  request: {
    params: IdParamsSchema,
  },
  responses: {
    200: {
      description: "deleted ingredient",
    },
    404: jsonContent(notFoundSchema, "ingredient not found"),
    400: jsonContent(createErrorSchema(IdParamsSchema), "invalid id type"),
  },
});

export const patch = createRoute({
  path: "/ingredients/{id}",
  method: "patch",
  request: {
    params: IdParamsSchema,
    body: jsonContentRequired(
      patchIngredientsSchema,
      "The task updates",
    ),
  },
  responses: {
    [200]: jsonContent(
      selectIngredientsSchema,
      "The updated ingredient",
    ),
    [404]: jsonContent(
      notFoundSchema,
      "ingredient not found",
    ),
    [400]: jsonContent(
      createErrorSchema(patchIngredientsSchema)
        .or(createErrorSchema(IdParamsSchema)),
      "The validation error(s)",
    ),
  },
});

export type listRoute = typeof list;
export type listOneRoute = typeof listOne;
export type createRoute = typeof create;
export type removeRoute = typeof remove ;
export type patchRoute = typeof patch ;