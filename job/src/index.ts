import { serve } from "@hono/node-server";
import app from "./app";

const port = 9999;

serve({ fetch: app.fetch, port }, (info) => {
  console.log(`Server running at http://localhost:${info.port}`);
});
