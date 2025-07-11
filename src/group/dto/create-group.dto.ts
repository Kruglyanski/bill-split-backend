import { Type } from 'class-transformer';
import {
  IsNotEmpty,
  IsString,
  IsArray,
  ArrayNotEmpty,
  IsInt,
  IsBoolean,
  ValidateNested,
  IsEmail,
} from 'class-validator';

// class ExtraUserDto {
//   @IsString()
//   name: string;

//   @IsEmail()
//   email: string;

//   @IsBoolean()
//   registered: boolean;
// }

export class CreateGroupDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsArray()
  @ArrayNotEmpty()
  @IsInt({ each: true })
  userIds: number[]; // Зарегистрированные пользователи

  // @IsArray()
  // @ValidateNested({ each: true })
  // @Type(() => ExtraUserDto)
  // extraUsers: ExtraUserDto[]; // Незарегистрированные пользователи
}
