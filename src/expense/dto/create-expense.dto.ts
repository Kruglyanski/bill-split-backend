import {
  IsNotEmpty,
  IsNumber,
  IsInt,
  IsString,
  ValidateNested,
  ArrayMinSize,
} from 'class-validator';
import { Type } from 'class-transformer';

class SplitDto {
  @IsInt()
  userId: number;

  @IsNumber()
  amount: number;
}

class PaidByUsersDto {
  @IsInt()
  userId: number;

  @IsNumber()
  amount: number;
}

export class CreateExpenseDto {
  @IsString()
  @IsNotEmpty()
  description: string;

  @IsNumber()
  amount: number;

  @IsInt()
  groupId: number;

  @ValidateNested({ each: true })
  @ArrayMinSize(1)
  @Type(() => PaidByUsersDto)
  paidByUsers: PaidByUsersDto[];

  @ValidateNested({ each: true })
  @ArrayMinSize(1)
  @Type(() => SplitDto)
  splits: SplitDto[];
}
