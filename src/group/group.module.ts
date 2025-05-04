import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Group } from './group.entity';
import { GroupService } from './group.service';
import { GroupController } from './group.controller';
import { User } from '../user/user.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Group, User])],
  providers: [GroupService],
  controllers: [GroupController],
})
export class GroupModule {}
