import { IsString, IsArray, ArrayNotEmpty, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export class ExtraUserDto {
  @IsString()
  email: string;

  @IsString()
  name: string;
}

export class UpdateGroupDto {
  @IsString()
  name: string;

  @IsArray()
  @ArrayNotEmpty()
  userIds: number[];

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ExtraUserDto)
  extraUsers: ExtraUserDto[];
}
