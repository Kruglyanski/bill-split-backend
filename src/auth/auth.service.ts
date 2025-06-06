import {
  BadRequestException,
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UserService } from '../user/user.service';
import * as bcrypt from 'bcryptjs';
import { OAuth2Client } from 'google-auth-library';
import { ConfigService } from '@nestjs/config';
import { LoginDto, RegisterDto } from './dto/login.dto';
import { MailService } from '../mailer/mailer.service';

@Injectable()
export class AuthService {
  private googleClient: OAuth2Client;
  private validAudiences: string[];
  constructor(
    private userService: UserService,
    private jwtService: JwtService,
    private configService: ConfigService,
    private mailService: MailService,
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

  async login(userData: LoginDto) {
    const user = await this.validateUser(userData.email, userData.password);
    const payload = { email: user.email, sub: user.id };

    return {
      token: this.jwtService.sign(payload),
      user,
    };
  }

  async register(userDto: RegisterDto) {
    const existingUser = await this.userService.findByEmail(userDto.email);

    const mailToken = this.jwtService.sign(
      {
        email: userDto.email,
        sub: existingUser ? existingUser.id : undefined,
      },
      {
        expiresIn: '1d',
      },
    );

    const expires = new Date();
    expires.setHours(expires.getHours() + 1);

    if (existingUser && existingUser.isEmailConfirmed) {
      throw new ConflictException('Email already in use');
    }

    if (existingUser && !existingUser.isEmailConfirmed) {
      existingUser.emailConfirmationToken = mailToken;
      existingUser.emailConfirmationTokenExpires = expires;
      existingUser.password = await bcrypt.hash(userDto.password, 10);
      await this.userService.update(existingUser.id, existingUser);

      await this.mailService.sendEmailConfirmation(
        existingUser.email,
        mailToken,
      );

      return {
        message:
          'Account already exists but not confirmed. We re-sent the confirmation email.',
      };
    }

    const hashedPassword = await bcrypt.hash(userDto.password, 10);

    const user = await this.userService.create({
      ...userDto,
      password: hashedPassword,
      emailConfirmationToken: mailToken,
      emailConfirmationTokenExpires: expires,
      isEmailConfirmed: false,
    });

    await this.mailService.sendEmailConfirmation(user.email, mailToken);

    return { message: 'User registered successfully' };
  }

  async confirmEmail(token: string) {
    const payload = this.jwtService.verify(token);

    const user = await this.userService.findByEmail(payload.email);

    if (
      !user ||
      user.emailConfirmationToken !== token ||
      (user.emailConfirmationTokenExpires !== null &&
        user.emailConfirmationTokenExpires < new Date())
    ) {
      throw new BadRequestException('Invalid or expired confirmation token');
    }

    const updPayload = {
      isEmailConfirmed: true,
      emailConfirmationToken: null,
      emailConfirmationTokenExpires: null,
    };

    await this.userService.update(user.id, updPayload);

    const newToken = this.jwtService.sign({ email: user.email, sub: user.id });
    console.log('newToken', newToken);
    return {
      message: 'Email confirmed successfully',
      token: newToken,
      user,
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
