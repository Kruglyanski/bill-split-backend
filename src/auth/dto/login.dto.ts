import { IsEmail, IsString } from 'class-validator';

export class LoginDto {
  @IsEmail()
  email: string;

  @IsString()
  password: string;
}

export class RegisterDto {
  @IsEmail()
  name: string;

  @IsEmail()
  email: string;

  @IsString()
  password: string;
}
