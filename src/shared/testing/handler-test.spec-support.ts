import type { Provider, Type } from "@nestjs/common";
import { Test } from "@nestjs/testing";

export function mockFn<T extends (...args: never[]) => unknown>() {
  return jest.fn<ReturnType<T>, Parameters<T>>();
}

export async function testHandler<T>(handler: Type<T>, providers: Provider[]): Promise<T> {
  const module = await Test.createTestingModule({ providers: [handler, ...providers] }).compile();

  return module.get(handler);
}
