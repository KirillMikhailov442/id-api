import { Injectable } from "@nestjs/common";
import { InjectDataSource } from "@nestjs/typeorm";
import type { ITransactionRunner } from "@shared/transaction/transaction-runner.type";
import type { DataSource, EntityManager } from "typeorm";

@Injectable()
export class DbTransactionRunner implements ITransactionRunner {
  private readonly dataSource: DataSource;

  constructor(
    @InjectDataSource()
    dataSource: DataSource
  ) {
    this.dataSource = dataSource;
  }

  run<T>(work: (entityManager: EntityManager) => Promise<T>): Promise<T> {
    return this.dataSource.transaction((entityManager) => work(entityManager));
  }
}
