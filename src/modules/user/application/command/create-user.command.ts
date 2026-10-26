export class CreateUserCommand {
  public readonly name: string;
  public readonly surname: string;
  public readonly email: string;
  public readonly password: string;

  constructor(name: string, surname: string, email: string, password: string) {
    this.name = name;
    this.surname = surname;
    this.email = email;
    this.password = password;
  }
}
