import { fileURLToPath } from "node:url";
import { defineWorkspace } from "vitest/config";

export default defineWorkspace([
  {
    test: {
      name: "shared",
      include: ["packages/shared/src/**/*.test.ts"],
      environment: "node",
    },
  },
  {
    resolve: {
      alias: {
        "@": fileURLToPath(new URL("./apps/web/src", import.meta.url)),
      },
    },
    test: {
      name: "web",
      include: ["apps/web/src/**/*.test.ts"],
      environment: "node",
    },
  },
  {
    test: {
      name: "worker",
      include: ["apps/worker/src/**/*.test.ts"],
      environment: "node",
    },
  },
]);
