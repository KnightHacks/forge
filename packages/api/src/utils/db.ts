import type { db } from "@forge/db/client";

type Database = typeof db;
type TransactionCallback = Parameters<Database["transaction"]>[0];

// Utilities that participate in a transaction should accept WriteDb.
// That keeps one function usable with the normal db client or a tx handle.
export type TransactionDb = Parameters<TransactionCallback>[0];
export type WriteDb = Database | TransactionDb;
