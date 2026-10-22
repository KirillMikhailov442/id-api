export const EXAMPLE_TIMESTAMP = "2026-10-21T09:00:00.000Z";

export const responseExample = (status: number, message: string, path: string) => ({
  status,
  message,
  path,
  timestamp: EXAMPLE_TIMESTAMP,
});
