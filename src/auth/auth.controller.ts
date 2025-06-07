import {
  Controller,
  Post,
  Body,
  BadRequestException,
  Get,
  Query,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/login.dto';

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Post('register')
  register(@Body() userDto: RegisterDto) {
    return this.authService.register(userDto);
  }

  @Post('login')
  async login(@Body() body) {
    return this.authService.login(body);
  }

  @Post('google')
  async googleLogin(@Body('idToken') idToken: string) {
    return this.authService.googleLogin(idToken);
  }

  @Get('confirm')
  async confirmEmail(@Query('token') mailToken: string) {
    console.log('confirmEmail', mailToken);
    if (!mailToken) {
      throw new BadRequestException('Email token is required');
    }

    return await this.authService.confirmEmail(mailToken);
  }
}
