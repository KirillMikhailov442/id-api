import { Module } from "@nestjs/common";
import { CqrsModule } from "@nestjs/cqrs";
import { TypeOrmModule } from "@nestjs/typeorm";

import { CoreModule } from "@core/core.module";

import { getTypeOrmConfig } from "@config/database";
import { registerEnvConfig } from "@config/env";

@Module({
  imports: [
    registerEnvConfig(),
    TypeOrmModule.forRootAsync({
      useFactory: () => getTypeOrmConfig(),
    }),
    CqrsModule.forRoot({
      rethrowUnhandled: true,
    }),
    CoreModule,
  ],
})
export class AppModule {}
