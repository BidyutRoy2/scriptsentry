import { defineConfig } from "vitest/config";

// The canonical test command is dependency-free: `npm test`
// (node --test, Node >= 22 runs the TypeScript suites directly).
// This config exists so contributors who prefer Vitest can run the
// same suites with `npm run test:vitest`.
export default defineConfig({ test: { include: ["tests/*.test.ts"] } });
