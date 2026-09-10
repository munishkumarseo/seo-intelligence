// Node/Vercel compatibility facade for values imported from
// `cloudflare:workflows`. The Node runtime does not provide Cloudflare's
// workflow engine, but application code can still use the same non-retryable
// error contract when shared workflow helpers are evaluated or called.

export class NonRetryableError extends Error {
  constructor(message?: string, options?: ErrorOptions) {
    super(message, options);
    this.name = "NonRetryableError";
  }
}
