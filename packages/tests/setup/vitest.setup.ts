// This file runs before each test file, ensuring testDb is initialized
// It only sets up once, even if called multiple times
import { setupDatabase } from "./db";

// Setup database - it will check if already initialized
await setupDatabase();
