import { Inject, Injectable } from "@nestjs/common";
import { CommandHandler, type ICommandHandler } from "@nestjs/cqrs";
import type { ITokenService } from "@shared/security/token-service";

import { RefreshCommand, type RefreshResult } from "@modules/session/application/command/refresh.command";
import type { IRefreshTokenService } from "@modules/session/application/port/refresh-token-service";
import type { ISessionRepository } from "@modules/session/application/port/session-repository";
import type { AccessTokenPayload, IssuedAccessToken } from "@modules/session/application/port/token-service";
import { InvalidRefreshTokenException } from "@modules/session/domain/exception/invalid-refresh-token.exception";
import { UserBlockedException } from "@modules/session/domain/exception/user-blocked.exception";
import { Browser } from "@modules/session/domain/value-object/browser.value-object";
import { DeviceType } from "@modules/session/domain/value-object/device-type.value-object";
import { Ip } from "@modules/session/domain/value-object/ip.value-object";
import { OperatingSystem } from "@modules/session/domain/value-object/operating-system.value-object";
import { REFRESH_TOKEN_SERVICE, SESSION_REPOSITORY, TOKEN_SERVICE } from "@modules/session/session.tokens";
import { UserBlockedStatus } from "@modules/user/domain/enum/user-blocked-status.enum";
import {
  ROLE_REPOSITORY,
  USER_REPOSITORY,
  type IRoleRepository,
  type IUserRepository,
} from "@modules/user/user.module";

@CommandHandler(RefreshCommand)
@Injectable()
export class RefreshCommandHandler implements ICommandHandler<RefreshCommand, RefreshResult> {
  constructor(
    @Inject(USER_REPOSITORY)
    private readonly userRepository: IUserRepository,
    @Inject(ROLE_REPOSITORY)
    private readonly roleRepository: IRoleRepository,
    @Inject(SESSION_REPOSITORY)
    private readonly sessionRepository: ISessionRepository,
    @Inject(REFRESH_TOKEN_SERVICE)
    private readonly refreshTokenService: IRefreshTokenService,
    @Inject(TOKEN_SERVICE)
    private readonly tokenService: ITokenService<AccessTokenPayload, IssuedAccessToken>
  ) {}

  async execute(command: RefreshCommand): Promise<RefreshResult> {
    const expectedRefreshHash = this.refreshTokenService.hash(command.refreshToken);
    const candidate = await this.sessionRepository.findByRefreshHash(expectedRefreshHash);

    if (candidate === null) {
      throw new InvalidRefreshTokenException();
    }

    const result = await this.sessionRepository.withUserLock(candidate.getUserId(), async (repository) => {
      const token = await repository.findRefreshToken(expectedRefreshHash);
      const session = await repository.findByRefreshHash(expectedRefreshHash);

      if (session === null || !session.isActive()) {
        throw new InvalidRefreshTokenException();
      }

      if (token === null || token.revokedAt !== null) {
        return null;
      }

      if (token.usedAt !== null) {
        await repository.revokeById(session.getId(), new Date());

        return null;
      }

      if (token.expiresAt.getTime() <= Date.now()) {
        return null;
      }

      const user = await this.userRepository.findById(session.getUserId());

      if (user === null) {
        throw new InvalidRefreshTokenException();
      }

      if (user.getIsBlocked() === UserBlockedStatus.Inactive) {
        throw new UserBlockedException();
      }

      const roleIds = user.getRoles().map((userRole) => userRole.getRoleId());
      const roles = await this.roleRepository.findByIds(roleIds);
      const issuedRefresh = await this.refreshTokenService.issue();
      const previousAccessExpiresAt = session.getLastAccessExpiresAt();
      const now = new Date();
      session.rotate({
        browser: Browser.fromNullable(command.deviceInfo.browser),
        os: OperatingSystem.fromNullable(command.deviceInfo.os),
        deviceType: DeviceType.fromNullable(command.deviceInfo.deviceType),
        ip: new Ip(command.ip),
        expiresAt: issuedRefresh.expiresAt,
        now,
      });

      const issuedAccess = await this.tokenService.issue({
        userId: user.getId().getValue(),
        sessionId: session.getId().getValue(),
        sessionVersion: session.getVersion(),
        roles: roles.map((role) => role.getName().getValue()),
      });
      session.recordAccessToken(issuedAccess.expiresAt);

      const rotated = await repository.rotate(
        session,
        expectedRefreshHash,
        this.refreshTokenService.hash(issuedRefresh.token),
        previousAccessExpiresAt
      );

      if (!rotated) {
        throw new InvalidRefreshTokenException();
      }

      return { accessToken: issuedAccess.token, refreshToken: issuedRefresh.token };
    });

    if (result === null) {
      throw new InvalidRefreshTokenException();
    }

    return result;
  }
}
