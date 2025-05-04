import {
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UserService } from '../user/user.service';
import * as bcrypt from 'bcryptjs';

@Injectable()
export class AuthService {
  constructor(
    private userService: UserService,
    private jwtService: JwtService,
  ) {}

  async validateUser(email: string, password: string) {
    const user = await this.userService.findByEmail(email);
    if (user && (await bcrypt.compare(password, user.password))) {
      const { password, ...result } = user;
      return result;
    }
    throw new UnauthorizedException('Invalid credentials');
  }

  async login(user: any) {
    const payload = { email: user.email, sub: user.id };
    return {
      access_token: this.jwtService.sign(payload),
    };
  }

  async register(userDto: any) {
    const existingUser = await this.userService.findByEmail(userDto.email);
    if (existingUser) {
      console.log('Email already exists');
      throw new ConflictException('Email already exists');
    }

    const hashedPassword = await bcrypt.hash(userDto.password, 10);

    const user = await this.userService.create({
      ...userDto,
      password: hashedPassword,
    });

    const token = await this.login(user);

    return {
      user,
      token: token.access_token,
    };
  }
}
