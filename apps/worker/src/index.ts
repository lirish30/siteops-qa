import "./lib/sentry";
import express from "express";
import { serve } from "inngest/express";
import { inngest } from "./inngest/client";
import { healthPing } from "./inngest/functions/health";

const app = express();
app.use(express.json());

app.use(
  "/api/inngest",
  serve({ client: inngest, functions: [healthPing] })
);

app.get("/healthz", (_req, res) => {
  res.json({ ok: true });
});

const port = Number(process.env.PORT ?? 3010);
app.listen(port, () => {
  console.log(JSON.stringify({ msg: "worker listening", port }));
});
