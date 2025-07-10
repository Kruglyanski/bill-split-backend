import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from './auth/auth.module';
import { UserModule } from './user/user.module';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { GroupModule } from './group/group.module';
import { ExpenseModule } from './expense/expense.module';
import { HealthModule } from './health/health.module';
import { AppGatewayModule } from './gateway/app-gateway.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        type: 'postgres',
        host: config.get<string>('DB_HOST'),
        port: config.get<number>('DB_PORT'),
        username: config.get<string>('DB_USERNAME'),
        password: config.get<string>('DB_PASSWORD'),
        database: config.get<string>('DB_NAME'),
        autoLoadEntities: true,
        synchronize: config.get<boolean>('DB_SYNC', true),
      }),
    }),
    AuthModule,
    UserModule,
    GroupModule,
    ExpenseModule,
    HealthModule,
    AppGatewayModule,
  ],
})
export class AppModule {}
