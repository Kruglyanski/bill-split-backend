import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Expense } from './expense.entity';
import { ExpenseSplit } from './expense-split.entity';
import { ExpenseService } from './expense.service';
import { ExpenseController } from './expense.controller';
import { Group } from '../group/group.entity';
import { User } from '../user/user.entity';
import { ExpensePayer } from './expense-payer.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Expense,
      ExpenseSplit,
      Group,
      User,
      ExpensePayer,
    ]),
  ],
  providers: [ExpenseService],
  controllers: [ExpenseController],
})
export class ExpenseModule {}
