export class ScopeAlreadyAssignedException extends Error {
  constructor(message = "Scope is already assigned to the client") {
    super(message);
    this.name = "ScopeAlreadyAssignedException";
  }
}
