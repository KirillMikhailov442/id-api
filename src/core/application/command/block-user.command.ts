export class BlockUserCommand {
  constructor(
    public readonly userId: string,
    public readonly reason?: string
  ) {}
}
