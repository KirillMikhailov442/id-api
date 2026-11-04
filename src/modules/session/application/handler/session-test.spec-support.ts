import { mockFn } from "@shared/testing/handler-test.spec-support";

import type { ISessionRepository } from "@modules/session/application/port/session-repository";
import { Session } from "@modules/session/domain/entity/session";
import { Ip } from "@modules/session/domain/value-object/ip.value-object";
import { UserId } from "@modules/user/user.ids";

export function makeSession() {
  return Session.create({
    userId: UserId.create(),
    browser: null,
    os: null,
    deviceType: null,
    ip: new Ip("127.0.0.1"),
    expiresAt: new Date("2100-01-01T00:00:00Z"),
  });
}

export function sessionRepository() {
  const repository = {
    findPageByUserId: mockFn<ISessionRepository["findPageByUserId"]>(),
    findById: mockFn<ISessionRepository["findById"]>(),
    save: mockFn<ISessionRepository["save"]>(),
    delete: mockFn<ISessionRepository["delete"]>(),
    findByRefreshHash: mockFn<ISessionRepository["findByRefreshHash"]>(),
    findRefreshToken: mockFn<ISessionRepository["findRefreshToken"]>(),
    createRefreshToken: mockFn<ISessionRepository["createRefreshToken"]>(),
    findByUserId: mockFn<ISessionRepository["findByUserId"]>(),
    findActiveByUserId: mockFn<ISessionRepository["findActiveByUserId"]>(),
    rotate: mockFn<ISessionRepository["rotate"]>(),
    revokeById: mockFn<ISessionRepository["revokeById"]>(),
    revokeByIdAndUserId: mockFn<ISessionRepository["revokeByIdAndUserId"]>(),
    revokeAllByUserId: mockFn<ISessionRepository["revokeAllByUserId"]>(),
    withUserLock<T>(_userId: UserId, work: (locked: ISessionRepository) => Promise<T>): Promise<T> {
      return work(repository);
    },
  };

  return repository;
}
