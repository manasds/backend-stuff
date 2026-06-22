import 'dotenv/config';
import { db } from './db';
import { recipes, ingredients, recipe_ingredients as recipeIngredients } from './db/schema';

async function seed() {
  const [carbonara] = await db.insert(recipes).values({
    name: 'Spaghetti Carbonara',
    description: 'Classic roman pasta dish with eggs and parmigiano',
    prepTime: 10,
    cookTime: 15,
    difficulty: 'medium',
    type: 'nonveg',
    category: 'Dinner',
    healthScore: 6,
  }).returning();

  const [greekSalad] = await db.insert(recipes).values({
    name: 'Greek Salad',
    description: 'Fresh mediterranean salad with feta and olives',
    prepTime: 15,
    cookTime: null,
    difficulty: 'easy',
    type: 'veg',
    category: 'Starter',
    healthScore: 9,
  }).returning();

  const [spaghetti] = await db.insert(ingredients).values({ name: 'Spaghetti', baseUnit: 'g' }).returning();
  const [egg] = await db.insert(ingredients).values({ name: 'Egg', baseUnit: 'piece' }).returning();
  const [parmigiano] = await db.insert(ingredients).values({ name: 'Parmigiano', baseUnit: 'g' }).returning();
  const [feta] = await db.insert(ingredients).values({ name: 'Feta cheese', baseUnit: 'g' }).returning();
  const [tomato] = await db.insert(ingredients).values({ name: 'Tomato', baseUnit: 'piece' }).returning();
  const [oliveOil] = await db.insert(ingredients).values({ name: 'Olive oil', baseUnit: 'ml' }).returning();

  await db.insert(recipeIngredients).values([
    { recipeId: carbonara.id, ingredientId: spaghetti.id, quantity: 200, notes: 'use dried' },
    { recipeId: carbonara.id, ingredientId: egg.id, quantity: 4, notes: 'farm-fresh preferred' },
    { recipeId: carbonara.id, ingredientId: parmigiano.id, quantity: 100, notes: 'freshly grated' },
    { recipeId: greekSalad.id, ingredientId: feta.id, quantity: 150, notes: 'blocked, not crumbled' },
    { recipeId: greekSalad.id, ingredientId: tomato.id, quantity: 3 },
    { recipeId: greekSalad.id, ingredientId: oliveOil.id, quantity: 30, unit: 'ml' },
  ]);

  console.log('Seeded successfully 🌱');
  process.exit(0);
}

seed().catch((e) => {
  console.error(e);
  process.exit(1);
});
