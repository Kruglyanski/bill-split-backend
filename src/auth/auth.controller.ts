import {
  Controller,
  Post,
  Body,
  BadRequestException,
  Get,
  Query,
  UseGuards,
  Req,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/login.dto';
import { JwtRtGuard } from './jwt-rt.guard';

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
    if (!mailToken) {
      throw new BadRequestException('Email token is required');
    }

    return await this.authService.confirmEmail(mailToken);
  }

  @Post('refresh')
  @UseGuards(JwtRtGuard)
  refreshTokens(@Req() req) {
    const userId = req.user.sub;
    const rt = req.user.refreshToken;
    return this.authService.refreshTokens(userId, rt);
  }

  @Post('logout')
  @UseGuards(JwtRtGuard)
  logout(@Req() req) {
    return this.authService.logout(req.user.sub);
  }
}
