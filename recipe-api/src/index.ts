import "dotenv/config";
import { OpenAPIHono } from "@hono/zod-openapi";
import { serve } from "@hono/node-server";
import app from "./app";
import { apiReference } from "@scalar/hono-api-reference";


app.doc("/doc", {
  openapi: "3.0.0",
  info: { title: "Recipe API", version: "1.0.0" },
});

app.get(
  "/reference",
  apiReference({
    theme: "deepSpace",
    defaultHttpClient: {
      targetKey: "javascript",
      clientKey: "fetch",
    },
    spec: {
      url: "/doc",
    },
  }),
);
serve({ fetch: app.fetch, port: 3000 }, (info) => {
  console.log(`Server running at http://localhost:${info.port}`);
});
