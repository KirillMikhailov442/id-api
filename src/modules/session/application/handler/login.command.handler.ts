import { Inject, Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { CommandHandler, type ICommandHandler } from "@nestjs/cqrs";

import { LoginCommand, type LoginResult } from "@modules/session/application/command/login.command";
import type { IRefreshTokenService } from "@modules/session/application/port/refresh-token-service";
import type { ISessionRepository } from "@modules/session/application/port/session-repository";
import type { ITokenService } from "@modules/session/application/port/token-service";
import { Session } from "@modules/session/domain/entity/session";
import { InvalidCredentialsException } from "@modules/session/domain/exception/invalid-credentials.exception";
import { UserBlockedException } from "@modules/session/domain/exception/user-blocked.exception";
import { Ip } from "@modules/session/domain/value-object/ip.value-object";
import { UserAgent } from "@modules/session/domain/value-object/user-agent.value-object";
import { REFRESH_TOKEN_SERVICE, SESSION_REPOSITORY, TOKEN_SERVICE } from "@modules/session/session.tokens";
import { UserBlockedStatus } from "@modules/user/domain/enum/user-blocked-status.enum";
import { Email } from "@modules/user/domain/value-object/email.value-object";
import {
  PASSWORD_HASHER,
  ROLE_REPOSITORY,
  USER_REPOSITORY,
  type IPasswordHasher,
  type IRoleRepository,
  type IUserRepository,
} from "@modules/user/user.module";

const REFRESH_TOKEN_TTL_KEY = "REFRESH_TOKEN_TTL";
const MS_PER_SECOND = 1000;

@CommandHandler(LoginCommand)
@Injectable()
export class LoginCommandHandler implements ICommandHandler<LoginCommand, LoginResult> {
  constructor(
    @Inject(USER_REPOSITORY) private readonly userRepository: IUserRepository,
    @Inject(PASSWORD_HASHER) private readonly passwordHasher: IPasswordHasher,
    @Inject(ROLE_REPOSITORY) private readonly roleRepository: IRoleRepository,
    @Inject(SESSION_REPOSITORY) private readonly sessionRepository: ISessionRepository,
    @Inject(REFRESH_TOKEN_SERVICE) private readonly refreshTokenService: IRefreshTokenService,
    @Inject(TOKEN_SERVICE) private readonly tokenService: ITokenService,
    @Inject(ConfigService) private readonly configService: ConfigService
  ) {}

  async execute(command: LoginCommand): Promise<LoginResult> {
    const email = new Email(command.email);
    const user = await this.userRepository.findByEmail(email);

    if (user === null || !(await this.passwordHasher.compare(command.password, user.getPasswordHash()))) {
      throw new InvalidCredentialsException();
    }

    if (user.getIsBlocked() === UserBlockedStatus.Inactive) {
      throw new UserBlockedException();
    }

    const refreshToken = this.refreshTokenService.generate();
    const ttlSeconds = this.configService.getOrThrow<number>(REFRESH_TOKEN_TTL_KEY);
    const session = Session.create({
      userId: user.getId(),
      refreshHash: this.refreshTokenService.hash(refreshToken),
      userAgent: new UserAgent(command.userAgent),
      ip: new Ip(command.ip),
      expiresAt: new Date(Date.now() + ttlSeconds * MS_PER_SECOND),
    });

    await this.sessionRepository.save(session);

    const roleIds = user.getRoles().map((userRole) => userRole.getRoleId());
    const roles = await this.roleRepository.findByIds(roleIds);

    const accessToken = await this.tokenService.issueAccessToken({
      userId: user.getId(),
      sessionId: session.getId(),
      roles: roles.map((role) => role.getName().getValue()),
    });

    return { accessToken, refreshToken };
  }
}
