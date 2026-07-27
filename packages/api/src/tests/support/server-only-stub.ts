// Stands in for the `server-only` package under vitest. The real module throws
// on import to stop server code reaching a client bundle; nothing here renders,
// so the guard has nothing to protect. See vitest.config.ts for the alias.
export {};
