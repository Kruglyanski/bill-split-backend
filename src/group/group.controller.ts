import {
  Body,
  Controller,
  Post,
  UseGuards,
  Request,
  Get,
  Param,
  Put,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { GroupService } from './group.service';
import { CreateGroupDto } from './dto/create-group.dto';
import { UpdateGroupDto } from './dto/update-group.dto';

@Controller('groups')
@UseGuards(JwtAuthGuard)
export class GroupController {
  constructor(private groupService: GroupService) {}

  @Post()
  createGroup(@Body() createGroupDto: CreateGroupDto) {
    return this.groupService.createGroup(createGroupDto);
  }

  @Put(':id')
  async updateGroup(
    @Param('id') id: number,
    @Body() updateGroupDto: UpdateGroupDto,
  ) {
    return this.groupService.updateGroup(id, updateGroupDto);
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
