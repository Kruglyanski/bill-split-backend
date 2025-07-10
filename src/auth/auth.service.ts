import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
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

  async getTokens(userId: number, email: string) {
    const [at, rt] = await Promise.all([
      this.jwtService.signAsync(
        { sub: userId, email },
        {
          secret: this.configService.get('JWT_SECRET'),
          expiresIn: this.configService.get('JWT_EXPIRES_IN') || '15m',
        },
      ),
      this.jwtService.signAsync(
        { sub: userId, email },
        {
          secret: this.configService.get('JWT_RT_SECRET'),
          expiresIn: this.configService.get('JWT_RT_EXPIRES_IN') || '7d',
        },
      ),
    ]);
    return { accessToken: at, refreshToken: rt };
  }

  async updateRefreshTokenHash(userId: number, rt: string) {
    const hash = await bcrypt.hash(rt, 10);
    await this.userService.update(userId, { hashedRt: hash });
  }

  async refreshTokens(userId: number, rt: string) {
    const user = await this.userService.findById(userId);
    if (!user || !user.hashedRt) throw new ForbiddenException();

    const rtMatches = await bcrypt.compare(rt, user.hashedRt);
    if (!rtMatches) throw new ForbiddenException('Invalid refresh token');

    const tokens = await this.getTokens(user.id, user.email);
    await this.updateRefreshTokenHash(user.id, tokens.refreshToken);
    return tokens;
  }

  async login(dto: LoginDto) {
    const user = await this.validateUser(dto.email, dto.password);

    const tokens = await this.getTokens(user.id, user.email);
    await this.updateRefreshTokenHash(user.id, tokens.refreshToken);

    return {
      tokens,
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
      try {
        await this.mailService.sendEmailConfirmation(
          existingUser.email,
          mailToken,
        );
        console.log('sendEmailConfirmation success');
      } catch (error) {
        console.log('sendEmailConfirmation error', error);
      }

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
    try {
      await this.mailService.sendEmailConfirmation(user.email, mailToken);
      console.log('sendEmailConfirmation success');
    } catch (error) {
      console.log('sendEmailConfirmation error', error);
    }
    return { message: 'User registered successfully' };
  }

  async confirmEmail(emailToken: string) {
    const payload = this.jwtService.verify(emailToken);

    const user = await this.userService.findByEmail(payload.email);

    if (
      !user ||
      user.emailConfirmationToken !== emailToken ||
      (user.emailConfirmationTokenExpires !== null &&
        user.emailConfirmationTokenExpires < new Date())
    ) {
      throw new BadRequestException(
        'Invalid or expired confirmation emailToken',
      );
    }

    const updPayload = {
      isEmailConfirmed: true,
      emailConfirmationToken: null,
      emailConfirmationTokenExpires: null,
    };

    await this.userService.update(user.id, updPayload);

    const tokens = await this.getTokens(user.id, user.email);

    await this.updateRefreshTokenHash(user.id, tokens.refreshToken);

    return {
      message: 'Email confirmed successfully',
      tokens,
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
      const tokens = await this.getTokens(user.id, user.email);

      await this.updateRefreshTokenHash(user.id, tokens.refreshToken);

      return {
        user,
        tokens,
      };
    }
  }

  async logout(userId: number) {
    await this.userService.update(userId, { hashedRt: null });
  }
}
