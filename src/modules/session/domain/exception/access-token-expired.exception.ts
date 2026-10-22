export class AccessTokenExpiredException extends Error {
  constructor(message = "Access token expired") {
    super(message);
    this.name = "AccessTokenExpiredException";
  }
}
