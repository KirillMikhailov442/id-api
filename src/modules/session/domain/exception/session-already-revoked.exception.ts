export class SessionAlreadyRevokedException extends Error {
  constructor(message = "Session is already revoked") {
    super(message);
    this.name = "SessionAlreadyRevokedException";
  }
}
