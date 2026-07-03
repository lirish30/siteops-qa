// Re-export: implementation moved to @siteops/shared so the worker can reuse
// the same SSRF-guarded fetch (Phase 2, TASK-027).
export * from "@siteops/shared/safe-fetch";
