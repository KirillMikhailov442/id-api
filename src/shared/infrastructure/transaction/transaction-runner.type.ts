import type { EntityManager } from "typeorm";

export interface ITransactionRunner {
  run<T>(work: (entityManager: EntityManager) => Promise<T>): Promise<T>;
}
