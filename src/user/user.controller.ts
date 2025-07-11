import {
  Controller,
  Get,
  UseGuards,
  Request,
  Query,
  NotFoundException,
  Post,
  Body,
  BadRequestException,
  Patch,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { UserService } from './user.service';

@Controller('users')
export class UserController {
  constructor(private readonly userService: UserService) {}

  @UseGuards(JwtAuthGuard)
  @Get()
  async getAllUsers() {
    return this.userService.findAll();
  }

  @UseGuards(JwtAuthGuard)
  @Get('related')
  async getRelatedUsers(@Request() req) {
    return this.userService.findRelatedUsers(req.user.userId);
  }

  @Get('paginated')
  async getPaginatedUsers(
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10,
  ) {
    return this.userService.findAllWithPagination((page - 1) * limit, limit);
  }

  @UseGuards(JwtAuthGuard)
  @Get('me')
  getProfile(@Request() req) {
    return this.userService.findById(req.user.userId);
  }

  @UseGuards(JwtAuthGuard)
  @Get('by-email')
  async getUserByEmail(@Query('email') email: string) {
    if (!email) {
      throw new NotFoundException('Email parameter is required');
    }
    const user = await this.userService.findByEmail(email);

    if (!user) {
      throw new NotFoundException(`User with email ${email} not found`);
    }

    return user;
  }

  @Post('fake')
  async createFake(@Body('name') name: string) {
    if (!name?.trim()) {
      throw new BadRequestException('Name is required');
    }

    const user = await this.userService.createWithFakeEmail(name);

    return user;
  }

  @UseGuards(JwtAuthGuard)
  @Patch('settings')
  async updateSettings(@Request() req, @Body('settings') settings: any) {
    const userId = req.user.userId;
    console.log('asd req ', req);
    const user = await this.userService.findById(userId);

    if (!user) throw new NotFoundException('User not found');

    const updatedSettings = {
      ...user.settings,
      ...settings,
    };

    return this.userService.update(userId, { settings: updatedSettings });
  }
}
