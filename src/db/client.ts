import mysql from "mysql2/promise"
import { drizzle } from "drizzle-orm/mysql2"
import * as schema from "@/src/db/schema"

const globalForDb = globalThis as unknown as {
   _dbPool?: ReturnType<typeof mysql.createPool>
}

const pool =
   globalForDb._dbPool ??
   mysql.createPool({
      host: process.env.DB_HOST,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD || undefined,
      database: process.env.DB_NAME,
      connectionLimit: 10,
   })

if (process.env.NODE_ENV !== "production") {
   globalForDb._dbPool = pool
}

export const db = drizzle(pool, { schema, mode: "default" })