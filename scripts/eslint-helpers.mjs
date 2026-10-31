export const noRestrictedImports = (patterns = []) => [
  "error",
  {
    patterns: [{ group: ["./**", "../**"], message: "Use project aliases instead of relative imports." }, ...patterns],
  },
];
