import {
  Body,
  Controller,
  Post,
  UseGuards,
  Request,
  Get,
  Param,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { GroupService } from './group.service';
import { CreateGroupDto } from './dto/create-group.dto';

@Controller('groups')
@UseGuards(JwtAuthGuard)
export class GroupController {
  constructor(private groupService: GroupService) {}

  @Post()
  createGroup(@Body() createGroupDto: CreateGroupDto) {
    return this.groupService.createGroup(createGroupDto);
  }

  @Get()
  getUserGroups(@Request() req) {
    return this.groupService.findAllForUser(req.user.userId);
  }

  @Get(':id/debts')
  getGroupDebts(@Param('id') groupId: number, @Request() req) {
    return this.groupService.calculateGroupDebts(+groupId, req.user.userId);
  }
}
