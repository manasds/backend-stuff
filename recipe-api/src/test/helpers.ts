import { db } from "../db";
import {
  ingredients,
  recipe_ingredients,
  recipes,
} from "../db/schema";

function suffix() {
  return `-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

export async function seedTestData(nameSuffix = suffix()) {
  const [tomato] = await db
    .insert(ingredients)
    .values({ name: `Tomato${nameSuffix}`, baseUnit: "piece" })
    .returning();
  const [spaghetti] = await db
    .insert(ingredients)
    .values({ name: `Spaghetti${nameSuffix}`, baseUnit: "g" })
    .returning();
  const [feta] = await db
    .insert(ingredients)
    .values({ name: `Feta cheese${nameSuffix}`, baseUnit: "g" })
    .returning();

  const [greekSalad] = await db
    .insert(recipes)
    .values({
      name: `Greek Salad${nameSuffix}`,
      description: "Fresh mediterranean salad",
      prepTime: 15,
      cookTime: null,
      difficulty: "easy",
      type: "veg",
      category: `Starter${nameSuffix}`,
      healthScore: 9,
    })
    .returning();

  const [carbonara] = await db
    .insert(recipes)
    .values({
      name: `Spaghetti Carbonara${nameSuffix}`,
      description: "Classic roman pasta",
      prepTime: 10,
      cookTime: 15,
      difficulty: "medium",
      type: "nonveg",
      category: `Dinner${nameSuffix}`,
      healthScore: 6,
    })
    .returning();

  await db.insert(recipe_ingredients).values([
    {
      recipeId: greekSalad.id,
      ingredientId: tomato.id,
      quantity: 3,
      unit: null,
      notes: null,
    },
    {
      recipeId: greekSalad.id,
      ingredientId: feta.id,
      quantity: 150,
      unit: "g",
      notes: "blocked",
    },
    {
      recipeId: carbonara.id,
      ingredientId: spaghetti.id,
      quantity: 200,
      unit: "g",
      notes: "dried",
    },
  ]);

  return {
    suffix: nameSuffix,
    ingredients: { tomato, spaghetti, feta },
    recipes: { greekSalad, carbonara },
  };
}

export async function seedIngredient(name?: string, baseUnit = "g") {
  const [ingredient] = await db
    .insert(ingredients)
    .values({ name: name ?? `Ingredient${suffix()}`, baseUnit })
    .returning();
  return ingredient;
}
