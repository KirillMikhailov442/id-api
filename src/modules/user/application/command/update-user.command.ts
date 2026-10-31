export class UpdateUserCommand {
  constructor(
    public readonly userId: string,
    public readonly name?: string,
    public readonly surname?: string,
    public readonly email?: string
  ) {}
}
