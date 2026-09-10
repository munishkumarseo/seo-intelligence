// Node/Vercel compatibility facade for application modules that import
// Cloudflare's runtime globals. Vite aliases `cloudflare:workers` to this file
// only for OPENSEO_RUNTIME=node; Cloudflare builds keep using the real module.

export const env = process.env;

export function waitUntil(promise: Promise<unknown>): void {
  // Node/Vercel has no global WorkerExecutionContext here. Keep the work alive
  // as a normal promise and consume rejection so fire-and-forget telemetry/cache
  // tasks do not become unhandled rejections.
  void promise.catch((error: unknown) => {
    console.error("Background task failed:", error);
  });
}

export class WorkflowEntrypoint {
  constructor(..._args: unknown[]) {
    throw new Error(
      "Cloudflare Workflows are unavailable in the Node/Vercel runtime.",
    );
  }
}

export class DurableObject {
  constructor(..._args: unknown[]) {
    throw new Error(
      "Cloudflare Durable Objects are unavailable in the Node/Vercel runtime.",
    );
  }
}
