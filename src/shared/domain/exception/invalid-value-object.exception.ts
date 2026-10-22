export class InvalidValueObjectException extends Error {
  constructor(message: string) {
    super(message);
    this.name = "InvalidValueObjectException";
  }
}
