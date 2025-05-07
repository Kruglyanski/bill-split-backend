import { Entity, PrimaryGeneratedColumn, ManyToOne, Column } from 'typeorm';
import { Expense } from './expense.entity';
import { User } from '../user/user.entity';

@Entity()
export class ExpensePayer {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => Expense, (expense) => expense.paidBy, {
    onDelete: 'CASCADE',
  })
  expense: Expense;

  @ManyToOne(() => User)
  user: User;

  @Column('float')
  amount: number;

  @Column()
  userId: number;
}
