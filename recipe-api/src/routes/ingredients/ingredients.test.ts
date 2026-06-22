import { describe, it, expect } from "vitest";
import app from "../../app";
import { seedIngredient, seedTestData } from "../../test/helpers";

describe("ingredients routes", () => {
  describe("GET /ingredients", () => {
    it("returns a list of ingredients", async () => {
      const res = await app.request("/ingredients");
      const body = await res.json();

      expect(res.status).toBe(200);
      expect(Array.isArray(body)).toBe(true);
    });

    it("includes newly seeded ingredients", async () => {
      const { ingredients } = await seedTestData();

      const res = await app.request("/ingredients");
      const body = await res.json();

      expect(res.status).toBe(200);
      expect(
        body.some((i: { id: number }) => i.id === ingredients.tomato.id),
      ).toBe(true);
    });
  });

  describe("GET /ingredients/:id", () => {
    it("returns a single ingredient", async () => {
      const { ingredients } = await seedTestData();

      const res = await app.request(`/ingredients/${ingredients.tomato.id}`);
      const body = await res.json();

      expect(res.status).toBe(200);
      expect(body.name).toBe(ingredients.tomato.name);
      expect(body.baseUnit).toBe("piece");
    });

    it("returns 404 when ingredient does not exist", async () => {
      const res = await app.request("/ingredients/99999999");
      const body = await res.json();

      expect(res.status).toBe(404);
      expect(body.message).toBe("ingredient not found");
    });

    it("returns 400 for invalid id", async () => {
      const res = await app.request("/ingredients/abc");
      expect(res.status).toBe(400);
    });
  });

  describe("POST /ingredients", () => {
    it("creates an ingredient", async () => {
      const name = `Olive oil-${Date.now()}`;
      const res = await app.request("/ingredients", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, baseUnit: "ml" }),
      });
      const body = await res.json();

      expect(res.status).toBe(200);
      expect(body.name).toBe(name);
      expect(body.baseUnit).toBe("ml");
      expect(body.id).toBeDefined();
    });

    it("returns 400 when name is missing", async () => {
      const res = await app.request("/ingredients", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ baseUnit: "g" }),
      });

      expect(res.status).toBe(400);
    });

    it("fails when creating duplicate ingredient name", async () => {
      const ingredient = await seedIngredient();

      const res = await app.request("/ingredients", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: ingredient.name, baseUnit: "g" }),
      });

      expect(res.status).toBeGreaterThanOrEqual(400);
    });
  });

  describe("PATCH /ingredients/:id", () => {
    it("updates an ingredient", async () => {
      const ingredient = await seedIngredient();

      const res = await app.request(`/ingredients/${ingredient.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ baseUnit: "bunch" }),
      });
      const body = await res.json();

      expect(res.status).toBe(200);
      expect(body.name).toBe(ingredient.name);
      expect(body.baseUnit).toBe("bunch");
    });

    it("returns 400 when body is empty", async () => {
      const ingredient = await seedIngredient();

      const res = await app.request(`/ingredients/${ingredient.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });

      expect(res.status).toBe(400);
    });

    it("returns 404 when ingredient does not exist", async () => {
      const res = await app.request("/ingredients/99999999", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: "Ghost" }),
      });
      const body = await res.json();

      expect(res.status).toBe(404);
      expect(body.message).toBe("ingredient not found");
    });
  });

  describe("DELETE /ingredients/:id", () => {
    it("deletes an ingredient", async () => {
      const ingredient = await seedIngredient();

      const deleteRes = await app.request(`/ingredients/${ingredient.id}`, {
        method: "DELETE",
      });
      expect(deleteRes.status).toBe(200);

      const getRes = await app.request(`/ingredients/${ingredient.id}`);
      expect(getRes.status).toBe(404);
    });

    it("returns 404 when ingredient does not exist", async () => {
      const res = await app.request("/ingredients/99999999", {
        method: "DELETE",
      });
      const body = await res.json();

      expect(res.status).toBe(404);
      expect(body.message).toBe("ingredient not found");
    });
  });
});
