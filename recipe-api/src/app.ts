import { OpenAPIHono } from "@hono/zod-openapi";
import { notFound, onError, serveEmojiFavicon } from "stoker/middlewares";
import recipes from "./routes/recipes/index.route";
import ingredients from "./routes/ingredients/index.routes"
const app = new OpenAPIHono();
app.use(serveEmojiFavicon("😍")) ;
app.get("/", (c) => {
  return c.text("yo nigga");
});

const routes = [
  recipes , 
  ingredients
] ;

routes.forEach((route) => {
  app.route("/", route);
});

app.notFound(notFound);
app.onError(onError);
export default app;
