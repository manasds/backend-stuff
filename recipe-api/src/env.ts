import { z, ZodError } from "zod";
import { config } from "dotenv";

config();
const EnvSchema = z.object({
  NODE_ENV: z.enum(["development", "production", "test"]).default("development") ,
  PORT: z.coerce.number().default(9999),
  DATABASE_URL: z.url(),
});

export type Env = z.infer<typeof EnvSchema> ;

const res  = EnvSchema.safeParse(process.env) ;

if(!res.success){
    console.error(z.treeifyError(res.error)) ;
    process.exit(1) ;
}

const env = res.data; 
export default env ;
