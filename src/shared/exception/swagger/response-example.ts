export const responseExample = (status: number, code: string, message: string, path: string) => ({
  status,
  code: code.toUpperCase(),
  message,
  path,
  timestamp: "2026-10-21T09:00:00.000Z",
});
