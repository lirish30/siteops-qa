import { Inngest } from "inngest";

// Web side only *sends* events; functions are served by apps/worker.
export const inngest = new Inngest({
  id: "siteops-qa",
  eventKey: process.env.INNGEST_EVENT_KEY,
});
