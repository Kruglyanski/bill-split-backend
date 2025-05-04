import { Body, Controller, Post, UseGuards, Request, Get } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { GroupService } from './group.service';
import { CreateGroupDto } from './dto/create-group.dto';

@Controller('groups')
@UseGuards(JwtAuthGuard)
export class GroupController {
  constructor(private groupService: GroupService) {}

  @Post()
  create(@Body() dto: CreateGroupDto, @Request() req) {
    return this.groupService.create(dto.name, [...dto.userIds, req.user.userId]);
  }

  @Get()
  getGroups(@Request() req) {
    return this.groupService.findAllForUser(req.user.userId);
  }
}
