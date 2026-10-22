export class ScopeNotFoundException extends Error {
  constructor(message = "Scope not found") {
    super(message);
    this.name = "ScopeNotFoundException";
  }
}
