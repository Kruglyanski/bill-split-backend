import {
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UserService } from '../user/user.service';
import * as bcrypt from 'bcryptjs';
import { OAuth2Client } from 'google-auth-library';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class AuthService {
  private googleClient: OAuth2Client;
  private validAudiences: string[];
  constructor(
    private userService: UserService,
    private jwtService: JwtService,
    private configService: ConfigService,
  ) {
    this.googleClient = new OAuth2Client();
    const rawIds = this.configService.get<string>('GOOGLE_CLIENT_IDS') || '';
    this.validAudiences = rawIds.split(',').map((id) => id.trim());
  }

  async validateUser(email: string, password: string) {
    const user = await this.userService.findByEmail(email);
    if (user && (await bcrypt.compare(password, user.password))) {
      const { password, ...result } = user;
      return result;
    }
    throw new UnauthorizedException('Invalid credentials');
  }

  async login(userData: any) {
    const payload = { email: userData.email, sub: userData.id };
    const user = await this.userService.findByEmail(userData.email);
    return {
      token: this.jwtService.sign(payload),
      user,
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

    const payload = { email: user.email, sub: user.id };
    const token = this.jwtService.sign(payload);

    return {
      user,
      token,
    };
  }

  async googleLogin(idToken: string) {
    const ticket = await this.googleClient.verifyIdToken({
      idToken,
      audience: this.validAudiences,
    });

    const payload = ticket.getPayload();

    if (!payload) {
      throw new UnauthorizedException('Invalid Google token');
    }

    const { email, sub: googleId, name, picture } = payload;

    let user = email && (await this.userService.findByEmail(email));

    if (!user) {
      user = await this.userService.create({
        email,
        googleId,
        name,
        password: '',
      });
    } else if (!user.googleId) {
      user = await this.userService.update(user.id, { googleId });
    }

    if (user) {
      const token = this.jwtService.sign({ email: user.email, sub: user.id });
      return {
        user,
        token,
      };
    }
  }
}
