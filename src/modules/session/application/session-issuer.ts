import { Inject, Injectable } from "@nestjs/common";
import type { ITokenService } from "@shared/security/token-service";

import type { LoginResult } from "@modules/session/application/command/login.command";
import type { DeviceInfo } from "@modules/session/application/device-info.type";
import type { IRefreshTokenService } from "@modules/session/application/port/refresh-token-service";
import type { ISessionRepository } from "@modules/session/application/port/session-repository";
import type { AccessTokenPayload, IssuedAccessToken } from "@modules/session/application/port/token-service";
import { Session } from "@modules/session/domain/entity/session";
import { UserBlockedException } from "@modules/session/domain/exception/user-blocked.exception";
import { Browser } from "@modules/session/domain/value-object/browser.value-object";
import { DeviceType } from "@modules/session/domain/value-object/device-type.value-object";
import { Ip } from "@modules/session/domain/value-object/ip.value-object";
import { OperatingSystem } from "@modules/session/domain/value-object/operating-system.value-object";
import { REFRESH_TOKEN_SERVICE, SESSION_REPOSITORY, TOKEN_SERVICE } from "@modules/session/session.tokens";
import { ROLE_REPOSITORY, UserBlockedStatus, type IRoleRepository, type User } from "@modules/user/user.module";

@Injectable()
export class SessionIssuer {
  constructor(
    @Inject(ROLE_REPOSITORY)
    private readonly roleRepository: IRoleRepository,
    @Inject(SESSION_REPOSITORY)
    private readonly sessionRepository: ISessionRepository,
    @Inject(REFRESH_TOKEN_SERVICE)
    private readonly refreshTokenService: IRefreshTokenService,
    @Inject(TOKEN_SERVICE)
    private readonly tokenService: ITokenService<AccessTokenPayload, IssuedAccessToken>
  ) {}

  async create(user: User, deviceInfo: DeviceInfo, ip: string): Promise<LoginResult> {
    if (user.getIsBlocked() === UserBlockedStatus.Inactive) {
      throw new UserBlockedException();
    }

    const issuedRefresh = await this.refreshTokenService.issue();
    const session = Session.create({
      userId: user.getId(),
      browser: Browser.fromNullable(deviceInfo.browser),
      os: OperatingSystem.fromNullable(deviceInfo.os),
      deviceType: DeviceType.fromNullable(deviceInfo.deviceType),
      ip: new Ip(ip),
      expiresAt: issuedRefresh.expiresAt,
    });
    const roleIds = user.getRoles().map((userRole) => userRole.getRoleId());
    const roles = await this.roleRepository.findByIds(roleIds);

    return this.sessionRepository.withUserLock(user.getId(), async (repository) => {
      const issuedAccess = await this.tokenService.issue({
        userId: user.getId().getValue(),
        sessionId: session.getId().getValue(),
        sessionVersion: session.getVersion(),
        roles: roles.map((role) => role.getName().getValue()),
      });
      session.recordAccessToken(issuedAccess.expiresAt);
      await repository.save(session);
      await repository.createRefreshToken(session, this.refreshTokenService.hash(issuedRefresh.token));

      return { accessToken: issuedAccess.token, refreshToken: issuedRefresh.token };
    });
  }
}
