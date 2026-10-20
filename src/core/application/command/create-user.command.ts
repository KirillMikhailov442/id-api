export class CreateUserCommand {
  constructor(
    public readonly name: string,
    public readonly surname: string,
    public readonly email: string,
    public readonly password: string
  ) {}
}
