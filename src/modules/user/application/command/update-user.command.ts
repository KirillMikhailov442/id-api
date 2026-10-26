export class UpdateUserCommand {
  public readonly userId: string;
  public readonly name: string;
  public readonly surname: string;
  public readonly email: string;

  constructor(userId: string, name: string, surname: string, email: string) {
    this.userId = userId;
    this.name = name;
    this.surname = surname;
    this.email = email;
  }
}
