import { defineWorkersConfig, readD1Migrations } from "@cloudflare/vitest-pool-workers/config";
import path from "node:path";

const migrations = await readD1Migrations(path.join(__dirname, "migrations"));

export default defineWorkersConfig({
  test: {
    setupFiles: ["./tests/setup.ts"],
    poolOptions: {
      workers: {
        wrangler: { configPath: "./wrangler.toml" },
        miniflare: {
          compatibilityFlags: ["nodejs_compat"],
          d1Databases: ["DB"],
          r2Buckets: ["IMAGES"],
          bindings: {
            GITHUB_CLIENT_ID: "test-client-id",
            GITHUB_CLIENT_SECRET: "test-client-secret",
            JWT_SECRET: "test-jwt-secret-32-bytes-min-len-ok",
            R2_BUCKET_NAME: "bangdream-na-images-test",
            CDN_ORIGIN: "https://cdn.bangdream.org",
            ADMIN_GITHUB_LOGINS: "suhang56",
            ALLOWED_ORIGINS:
              "https://bangdream.org,http://localhost:5173,http://localhost:4173",
            TEST_MIGRATIONS: migrations,
          },
        },
      },
    },
    coverage: {
      provider: "istanbul" as const,
      reporter: ["text", "json-summary", "html"],
      include: ["src/**/*.ts"],
      exclude: [
        "src/**/*.test.ts",
        "src/db/schema.ts",
        "src/custom-env.d.ts",
      ],
      thresholds: {
        "src/auth/**": {
          lines: 80,
          functions: 80,
          branches: 80,
          statements: 80,
        },
        "src/routes/**": {
          functions: 80,
          branches: 80,
        },
      },
    },
  },
});
