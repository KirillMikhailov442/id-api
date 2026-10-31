export const EXAMPLE_TIMESTAMP = "2026-10-21T09:00:00.000Z";

export const responseExample = (status: number, code: string, message: string, path: string) => ({
  status,
  code,
  message,
  path,
  timestamp: EXAMPLE_TIMESTAMP,
});
