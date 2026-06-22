import { OpenAPIHono } from "@hono/zod-openapi";
import * as routes from "./ingredients.routes";
import * as handlers from "./ingredients.handlers";

const router = new OpenAPIHono()
    .openapi(routes.list ,handlers.list)
    .openapi(routes.listOne , handlers.listOne)
    .openapi(routes.create , handlers.create)
    .openapi(routes.remove ,handlers.remove)
    .openapi(routes.patch , handlers.patch)


export default router ;