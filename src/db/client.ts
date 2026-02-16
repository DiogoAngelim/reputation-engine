import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "./schema.js";

const { Pool } = pg;

let client: ReturnType<typeof drizzle> | null = null;

export const getDb = () => {
  if (client) return client;

  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL is required");
  }

  const pool = new Pool({ connectionString });
  client = drizzle(pool, { schema });
  return client;
};

export type DbClient = ReturnType<typeof getDb>;
