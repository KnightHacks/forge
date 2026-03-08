// This file runs before each test file, ensuring testDb is initialized
// It only sets up once, even if called multiple times
import { vi } from "vitest";

import { setupDatabase } from "./db";

// Mock server-only to allow importing server-only modules in tests
vi.mock("server-only", () => ({}));

// Setup database - it will check if already initialized
await setupDatabase();
