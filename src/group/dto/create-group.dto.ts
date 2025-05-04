import { IsNotEmpty, IsString, IsArray, ArrayNotEmpty, IsInt } from 'class-validator';

export class CreateGroupDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsArray()
  @ArrayNotEmpty()
  @IsInt({ each: true })
  userIds: number[];
}
