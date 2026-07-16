import "server-only"

// Postgres caps a single statement at 65535 bind parameters, and Drizzle's query
// builder overflows its call stack well before that on very large single-statement
// inserts (a ~6k-row × ~23-column insert throws "Maximum call stack size exceeded").
// Chunk any insert whose row count scales with input — bulk uploads and index
// membership snapshots. Every table here has < ~25 insertable columns, so 500
// rows/statement (< ~12.5k params) stays safely under both limits.
export const DB_INSERT_CHUNK_SIZE = 500

// Split an array into fixed-size chunks (last chunk may be smaller).
export function chunk<T>(arr: T[], size: number = DB_INSERT_CHUNK_SIZE): T[][] {
   const out: T[][] = []
   for (let i = 0; i < arr.length; i += size) {
      out.push(arr.slice(i, i + size))
   }
   return out
}
