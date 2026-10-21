export class SessionNotFoundException extends Error {
  constructor(message = "Session not found") {
    super(message);
    this.name = "SessionNotFoundException";
  }
}
