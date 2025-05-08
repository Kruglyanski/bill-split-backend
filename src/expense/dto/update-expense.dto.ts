import {
  IsNumber,
  IsPositive,
  IsString,
  IsNotEmpty,
  IsArray,
  ValidateNested,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';

class SplitDto {
  @IsNumber()
  userId: number;

  @IsNumber()
  @Min(0, { message: 'Сумма доли должна быть больше или равна 0' })
  amount: number;
}

class PayByDto {
  //может что-то общее есть?
  @IsNumber()
  userId: number;

  @IsNumber()
  @Min(0, { message: 'Сумма доли должна быть больше или равна 0' })
  amount: number;
}

export class UpdateExpenseDto {
  @IsString()
  @IsNotEmpty({ message: 'Описание не должно быть пустым' })
  description: string;

  @IsNumber()
  @IsPositive({ message: 'Сумма должна быть положительным числом' })
  amount: number;

  @IsNumber()
  groupId: number;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SplitDto)
  splits: SplitDto[];

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PayByDto)
  paidBy: PayByDto[];
}
