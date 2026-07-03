import { inngest } from "../client";

// Trivial liveness function: proves the worker is registered with Inngest
// and can execute steps. Real scan functions arrive in Phase 2.
export const healthPing = inngest.createFunction(
  { id: "health-ping" },
  { event: "app/health.ping" },
  async ({ event, step }) => {
    const echoed = await step.run("echo", async () => ({
      pong: true,
      receivedAt: new Date().toISOString(),
      data: event.data ?? null,
    }));
    return echoed;
  }
);
