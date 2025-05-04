import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, OneToMany } from 'typeorm';
import { Group } from '../group/group.entity';
import { User } from '../user/user.entity';
import { ExpenseSplit } from './expense-split.entity';

@Entity()
export class Expense {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  description: string;

  @Column('float')
  amount: number;

  @ManyToOne(() => Group, group => group.expenses)
  group: Group;

  @ManyToOne(() => User)
  paidBy: User;

  @OneToMany(() => ExpenseSplit, split => split.expense, { cascade: true })
  splits: ExpenseSplit[];
}
