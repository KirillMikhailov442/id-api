import { Inject, Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { CommandHandler, type ICommandHandler } from "@nestjs/cqrs";

import { RefreshCommand, type RefreshResult } from "@modules/session/application/command/refresh.command";
import type { IRefreshTokenService } from "@modules/session/application/port/refresh-token-service";
import type { ISessionRepository } from "@modules/session/application/port/session-repository";
import type { ITokenService } from "@modules/session/application/port/token-service";
import { Session } from "@modules/session/domain/entity/session";
import { InvalidRefreshTokenException } from "@modules/session/domain/exception/invalid-refresh-token.exception";
import { UserBlockedException } from "@modules/session/domain/exception/user-blocked.exception";
import { Ip } from "@modules/session/domain/value-object/ip.value-object";
import { REFRESH_TOKEN_SERVICE, SESSION_REPOSITORY, TOKEN_SERVICE } from "@modules/session/session.tokens";
import { UserBlockedStatus } from "@modules/user/domain/enum/user-blocked-status.enum";
import {
  ROLE_REPOSITORY,
  USER_REPOSITORY,
  type IRoleRepository,
  type IUserRepository,
} from "@modules/user/user.module";

const REFRESH_TOKEN_TTL_KEY = "REFRESH_TOKEN_TTL";

const MS_PER_SECOND = 1000;

@CommandHandler(RefreshCommand)
@Injectable()
export class RefreshCommandHandler implements ICommandHandler<RefreshCommand, RefreshResult> {
  private readonly userRepository: IUserRepository;
  private readonly roleRepository: IRoleRepository;
  private readonly sessionRepository: ISessionRepository;
  private readonly refreshTokenService: IRefreshTokenService;
  private readonly tokenService: ITokenService;
  private readonly configService: ConfigService;

  constructor(
    @Inject(USER_REPOSITORY)
    userRepository: IUserRepository,
    @Inject(ROLE_REPOSITORY)
    roleRepository: IRoleRepository,
    @Inject(SESSION_REPOSITORY)
    sessionRepository: ISessionRepository,
    @Inject(REFRESH_TOKEN_SERVICE)
    refreshTokenService: IRefreshTokenService,
    @Inject(TOKEN_SERVICE)
    tokenService: ITokenService,
    @Inject(ConfigService)
    configService: ConfigService
  ) {
    this.userRepository = userRepository;
    this.roleRepository = roleRepository;
    this.sessionRepository = sessionRepository;
    this.refreshTokenService = refreshTokenService;
    this.tokenService = tokenService;
    this.configService = configService;
  }

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
      deviceInfo: command.deviceInfo,
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
