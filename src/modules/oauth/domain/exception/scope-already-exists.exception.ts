export class ScopeAlreadyExistsException extends Error {
  constructor(message = "Scope already exists") {
    super(message);
    this.name = "ScopeAlreadyExistsException";
  }
}
