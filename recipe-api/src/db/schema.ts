import {
  integer,
  pgTable,
  text,
  pgEnum,
  timestamp,
  serial,
  unique,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

export const difficultyEnum = pgEnum("difficulty", ["easy", "medium", "hard"]);
export const typeEnum = pgEnum("type", ["veg", "nonveg"]);

export const recipes = pgTable("recipes", {
  id: serial().primaryKey(),
  name: text().notNull(),
  description: text(),
  prepTime: integer(),
  cookTime: integer(),
  difficulty: difficultyEnum().notNull(),
  type: typeEnum().notNull(),
  category: text(),
  healthScore: integer(),
  createdAt: timestamp().defaultNow(),
  updatedAt: timestamp().defaultNow(),
});

export const ingredients = pgTable("ingredients", {
  id: serial().primaryKey(),
  name: text().notNull().unique(),
  baseUnit: text(),
});

export const recipe_ingredients = pgTable("recipe_ingredients", {
  id: serial().primaryKey(),
  recipeId: integer()
    .notNull()
    .references(() => recipes.id, { onDelete: "cascade" }),
  ingredientId: integer()
    .notNull()
    .references(() => ingredients.id, { onDelete: "cascade" }),
  quantity: integer().notNull(),
  unit: text(),
  notes: text(),

} , 
(table) => [
  unique().on(table.recipeId, table.ingredientId),
]);

export const recipesRelations = relations(recipes, ({ many }) => ({
  recipeIngredients: many(recipe_ingredients),
}));
export const ingredientsRelations = relations(ingredients, ({ many }) => ({
  recipeIngredients: many(recipe_ingredients),
}));
export const recipeIngredientsRelations = relations(recipe_ingredients, ({ one }) => ({
  recipe: one(recipes, {
    fields: [recipe_ingredients.recipeId],
    references: [recipes.id],
  }),
  ingredient: one(ingredients, {
    fields: [recipe_ingredients.ingredientId],
    references: [ingredients.id],
  }),
}));
