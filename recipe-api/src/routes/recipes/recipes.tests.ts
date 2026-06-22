import { describe, it, expect, beforeAll } from "vitest";
import app from "../../app";
import { db } from "../../db";
import { recipe_ingredients } from "../../db/schema";
import { eq } from "drizzle-orm";
import { seedTestData } from "../../test/helpers";

describe("recipes routes", () => {
  let seeded: Awaited<ReturnType<typeof seedTestData>>;

  beforeAll(async () => {
    seeded = await seedTestData();
  }, 30_000);

  describe("GET /recipes", () => {
    it("returns recipes with flattened ingredients", async () => {
      const res = await app.request("/recipes");
      expect(res.status).toBe(200);

      const body = await res.json();
      const salad = body.find(
        (r: { name: string }) => r.name === seeded.recipes.greekSalad.name,
      );

      expect(salad).toBeDefined();
      expect(salad.ingredients).toHaveLength(2);
      expect(salad.ingredients[0]).toMatchObject({
        name: expect.any(String),
        baseUnit: expect.any(String),
        quantity: expect.any(Number),
      });
      expect(salad.ingredients[0]).not.toHaveProperty("ingredientId");
      expect(salad.ingredients[0]).not.toHaveProperty("recipeId");
    });

    it("filters by difficulty", async () => {
      const res = await app.request(
        `/recipes?difficulty=easy&name=${encodeURIComponent(seeded.suffix)}`,
      );
      const body = await res.json();

      expect(res.status).toBe(200);
      expect(body).toHaveLength(1);
      expect(body[0].name).toBe(seeded.recipes.greekSalad.name);
    });

    it("filters by type", async () => {
      const res = await app.request(
        `/recipes?type=nonveg&name=${encodeURIComponent(seeded.suffix)}`,
      );
      const body = await res.json();

      expect(res.status).toBe(200);
      expect(body).toHaveLength(1);
      expect(body[0].name).toBe(seeded.recipes.carbonara.name);
    });

    it("filters by category", async () => {
      const res = await app.request(
        `/recipes?category=${encodeURIComponent(`Starter${seeded.suffix}`)}`,
      );
      const body = await res.json();

      expect(res.status).toBe(200);
      expect(body).toHaveLength(1);
      expect(body[0].category).toBe(`Starter${seeded.suffix}`);
    });

    it("filters by healthScore", async () => {
      const res = await app.request(
        `/recipes?healthScore=9&name=${encodeURIComponent(seeded.suffix)}`,
      );
      const body = await res.json();

      expect(res.status).toBe(200);
      expect(body).toHaveLength(1);
      expect(body[0].healthScore).toBe(9);
    });

    it("filters by recipe name (partial match)", async () => {
      const res = await app.request(
        `/recipes?name=${encodeURIComponent("Carbonara" + seeded.suffix)}`,
      );
      const body = await res.json();

      expect(res.status).toBe(200);
      expect(body).toHaveLength(1);
      expect(body[0].name).toBe(seeded.recipes.carbonara.name);
    });

    it("filters by ingredient name (partial match)", async () => {
      const res = await app.request(
        `/recipes?ingredientName=${encodeURIComponent("Tomato" + seeded.suffix)}`,
      );
      const body = await res.json();

      expect(res.status).toBe(200);
      expect(body).toHaveLength(1);
      expect(body[0].name).toBe(seeded.recipes.greekSalad.name);
      expect(body[0].ingredients).toHaveLength(2);
    });

    it("combines multiple filters", async () => {
      const res = await app.request(
        `/recipes?difficulty=easy&type=veg&ingredientName=${encodeURIComponent(seeded.ingredients.feta.name)}`,
      );
      const body = await res.json();

      expect(res.status).toBe(200);
      expect(body).toHaveLength(1);
      expect(body[0].name).toBe(seeded.recipes.greekSalad.name);
    });

    it("returns empty array when no recipes match", async () => {
      const res = await app.request("/recipes?name=nonexistent-recipe-xyz-999");
      const body = await res.json();

      expect(res.status).toBe(200);
      expect(body).toEqual([]);
    });

    it("returns 400 for invalid difficulty", async () => {
      const res = await app.request("/recipes?difficulty=impossible");
      expect(res.status).toBe(400);
    });
  });

  describe("GET /recipes/:id", () => {
    it("returns a single recipe with ingredients", async () => {
      const res = await app.request(
        `/recipes/${seeded.recipes.greekSalad.id}`,
      );
      const body = await res.json();

      expect(res.status).toBe(200);
      expect(body.name).toBe(seeded.recipes.greekSalad.name);
      expect(body.ingredients).toHaveLength(2);
    });

    it("returns 404 when recipe does not exist", async () => {
      const res = await app.request("/recipes/99999999");
      const body = await res.json();

      expect(res.status).toBe(404);
      expect(body.message).toBe("recipe not found");
    });

    it("returns 400 for invalid id", async () => {
      const res = await app.request("/recipes/abc");
      expect(res.status).toBe(400);
    });
  });

  describe("POST /recipes", () => {
    it("creates a recipe without ingredients", async () => {
      const name = `Plain Toast${seeded.suffix}-post`;
      const res = await app.request("/recipes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          difficulty: "easy",
          type: "veg",
        }),
      });
      const body = await res.json();

      expect(res.status).toBe(200);
      expect(body.name).toBe(name);
      expect(body.ingredients).toEqual([]);
    });

    it("creates a recipe with ingredients", async () => {
      const res = await app.request("/recipes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: `Tomato Bruschetta${seeded.suffix}`,
          difficulty: "easy",
          type: "veg",
          ingredients: [
            {
              ingredientId: seeded.ingredients.tomato.id,
              quantity: 2,
              unit: "piece",
              notes: "ripe",
            },
          ],
        }),
      });
      const body = await res.json();

      expect(res.status).toBe(200);
      expect(body.ingredients).toHaveLength(1);
      expect(body.ingredients[0]).toMatchObject({
        name: seeded.ingredients.tomato.name,
        quantity: 2,
        notes: "ripe",
      });
    });

    it("returns 404 when ingredient id does not exist", async () => {
      const res = await app.request("/recipes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: `Bad Recipe${seeded.suffix}`,
          difficulty: "easy",
          type: "veg",
          ingredients: [{ ingredientId: 99999999, quantity: 1 }],
        }),
      });
      const body = await res.json();

      expect(res.status).toBe(404);
      expect(body.message).toBe("ingredient not found");
    });

    it("returns 400 when required fields are missing", async () => {
      const res = await app.request("/recipes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: "Incomplete" }),
      });

      expect(res.status).toBe(400);
    });
  });

  describe("PATCH /recipes/:id", () => {
    it("updates recipe fields without ingredients in response", async () => {
      const createRes = await app.request("/recipes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: `Patch Me${seeded.suffix}`,
          difficulty: "easy",
          type: "veg",
        }),
      });
      const created = await createRes.json();

      const res = await app.request(`/recipes/${created.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: `Patched${seeded.suffix}` }),
      });
      const body = await res.json();

      expect(res.status).toBe(200);
      expect(body.name).toBe(`Patched${seeded.suffix}`);
      expect(body).not.toHaveProperty("ingredients");
    });

    it("returns 400 when body is empty", async () => {
      const res = await app.request(
        `/recipes/${seeded.recipes.greekSalad.id}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({}),
        },
      );

      expect(res.status).toBe(400);
    });

    it("returns 404 when recipe does not exist", async () => {
      const res = await app.request("/recipes/99999999", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: "Ghost" }),
      });
      const body = await res.json();

      expect(res.status).toBe(404);
      expect(body.message).toBe("recipe not found");
    });
  });

  describe("DELETE /recipes/:id", () => {
    it("deletes a recipe and cascades junction rows", async () => {
      const createRes = await app.request("/recipes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: `Delete Me${seeded.suffix}`,
          difficulty: "easy",
          type: "veg",
          ingredients: [
            {
              ingredientId: seeded.ingredients.tomato.id,
              quantity: 1,
            },
          ],
        }),
      });
      const created = await createRes.json();
      const recipeId = created.id;

      const deleteRes = await app.request(`/recipes/${recipeId}`, {
        method: "DELETE",
      });
      expect(deleteRes.status).toBe(200);

      const getRes = await app.request(`/recipes/${recipeId}`);
      expect(getRes.status).toBe(404);

      const links = await db
        .select()
        .from(recipe_ingredients)
        .where(eq(recipe_ingredients.recipeId, recipeId));
      expect(links).toHaveLength(0);
    });

    it("returns 404 when recipe does not exist", async () => {
      const res = await app.request("/recipes/99999999", { method: "DELETE" });
      const body = await res.json();

      expect(res.status).toBe(404);
      expect(body.message).toBe("recipe not found");
    });
  });
});
