# Recipe API — Goals

## Data Model
- **recipes** — core recipe info (name, description, prepTime, cookTime, difficulty, type, category, healthScore, timestamps)
- **ingredients** — standalone ingredient catalog (name, baseUnit)
- **recipe_ingredients** — junction table linking recipes to ingredients with quantity, unit, notes

## Endpoints

### GET /recipes
- Return all recipes, each with a nested `ingredients` array
- Each ingredient entry includes full ingredient details (id, name, baseUnit) plus junction fields (quantity, unit, notes)

### GET /recipes/:id
- Return a single recipe with the same nested shape as list

### POST /recipes
- Create a recipe with optional nested ingredients
- Validates all ingredientIds exist — returns 404 if any are missing
- Inserts recipe + junction rows in a transaction

### PATCH /recipes/:id
- Partial update of recipe fields only (no ingredient manipulation)

### DELETE /recipes/:id
- Cascade delete — removes recipe and its recipe_ingredients links

### GET /ingredients
- Return all ingredients

### GET /ingredients/:id
- Return a single ingredient

### POST /ingredients
- Create an ingredient

### PATCH /ingredients/:id
- Partial update of ingredient

### DELETE /ingredients/:id
- Delete an ingredient

## Future
- Search / filter recipes (difficulty, type, category, healthScore) — later
