import type { db } from "@forge/db/client";

type Database = typeof db;
type TransactionCallback = Parameters<Database["transaction"]>[0];

// Utilities that participate in a transaction should accept WriteDb.
// That keeps one function usable with the normal db client or a tx handle.
export type TransactionDb = Parameters<TransactionCallback>[0];
export type WriteDb = Database | TransactionDb;

// Postgres reports a unique constraint violation as SQLSTATE 23505. Drivers
// often wrap the original error, so check the `cause` chain too.
export function isUniqueViolation(error: unknown): boolean {
  if (typeof error !== "object" || error === null) return false;

  if ("code" in error && error.code === "23505") return true;

  return (
    "cause" in error &&
    typeof error.cause === "object" &&
    error.cause !== null &&
    isUniqueViolation(error.cause)
  );
}
