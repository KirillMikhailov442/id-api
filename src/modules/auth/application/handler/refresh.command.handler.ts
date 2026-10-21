import { Inject, Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { CommandHandler, type ICommandHandler } from "@nestjs/cqrs";

import { RefreshCommand, type RefreshResult } from "@modules/auth/application/command/refresh.command";
import type { IRefreshTokenService } from "@modules/auth/application/port/refresh-token-service";
import type { ISessionRepository } from "@modules/auth/application/port/session-repository";
import type { ITokenService } from "@modules/auth/application/port/token-service";
import { REFRESH_TOKEN_SERVICE, SESSION_REPOSITORY, TOKEN_SERVICE } from "@modules/auth/auth.tokens";
import { Session } from "@modules/auth/domain/entity/session";
import { InvalidRefreshTokenException } from "@modules/auth/domain/exception/invalid-refresh-token.exception";
import { UserBlockedException } from "@modules/auth/domain/exception/user-blocked.exception";
import { Ip } from "@modules/auth/domain/value-object/ip.value-object";
import { UserAgent } from "@modules/auth/domain/value-object/user-agent.value-object";

import { ROLE_REPOSITORY, USER_REPOSITORY, type IRoleRepository, type IUserRepository } from "@core/core.module";
import { UserBlockedStatus } from "@core/domain/enum/user-blocked-status.enum";

const REFRESH_TOKEN_TTL_KEY = "REFRESH_TOKEN_TTL";
const MS_PER_SECOND = 1000;

@CommandHandler(RefreshCommand)
@Injectable()
export class RefreshCommandHandler implements ICommandHandler<RefreshCommand, RefreshResult> {
  constructor(
    @Inject(USER_REPOSITORY) private readonly userRepository: IUserRepository,
    @Inject(ROLE_REPOSITORY) private readonly roleRepository: IRoleRepository,
    @Inject(SESSION_REPOSITORY) private readonly sessionRepository: ISessionRepository,
    @Inject(REFRESH_TOKEN_SERVICE) private readonly refreshTokenService: IRefreshTokenService,
    @Inject(TOKEN_SERVICE) private readonly tokenService: ITokenService,
    @Inject(ConfigService) private readonly configService: ConfigService
  ) {}

  async execute(command: RefreshCommand): Promise<RefreshResult> {
    const session = await this.sessionRepository.findByRefreshHash(this.refreshTokenService.hash(command.refreshToken));

    if (session === null || !session.isActive()) {
      throw new InvalidRefreshTokenException();
    }

    const user = await this.userRepository.findById(session.getUserId());

    if (user === null) {
      throw new InvalidRefreshTokenException();
    }

    if (user.getIsBlocked() === UserBlockedStatus.Inactive) {
      throw new UserBlockedException();
    }

    session.revoke();
    await this.sessionRepository.save(session);

    const refreshToken = this.refreshTokenService.generate();
    const ttlSeconds = this.configService.getOrThrow<number>(REFRESH_TOKEN_TTL_KEY);
    const rotatedSession = Session.create({
      userId: user.getId(),
      refreshHash: this.refreshTokenService.hash(refreshToken),
      userAgent: new UserAgent(command.userAgent),
      ip: new Ip(command.ip),
      expiresAt: new Date(Date.now() + ttlSeconds * MS_PER_SECOND),
      familyId: session.getFamilyId(),
    });

    await this.sessionRepository.save(rotatedSession);

    const roleIds = user.getRoles().map((userRole) => userRole.getRoleId());
    const roles = await this.roleRepository.findByIds(roleIds);

    const accessToken = await this.tokenService.issueAccessToken({
      userId: user.getId(),
      sessionId: rotatedSession.getId(),
      roles: roles.map((role) => role.getName().getValue()),
    });

    return { accessToken, refreshToken };
  }
}
