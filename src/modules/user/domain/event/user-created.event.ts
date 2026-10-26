export class UserCreatedEvent {
  public readonly userId: string;
  public readonly email: string;
  public readonly name: string;

  constructor(userId: string, email: string, name: string) {
    this.userId = userId;
    this.email = email;
    this.name = name;
  }
}
