export class ScopeNotAssignedException extends Error {
  constructor(message = "Scope is not assigned to the client") {
    super(message);
    this.name = "ScopeNotAssignedException";
  }
}
