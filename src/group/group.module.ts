import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Group } from './group.entity';
import { GroupService } from './group.service';
import { GroupController } from './group.controller';
import { User } from '../user/user.entity';
import { AppGatewayModule } from '../gateway/app-gateway.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Group, User]),
    forwardRef(() => AppGatewayModule),
  ],
  providers: [GroupService],
  controllers: [GroupController],
  exports: [GroupService],
})
export class GroupModule {}
