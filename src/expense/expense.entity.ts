import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  OneToMany,
} from 'typeorm';
import { Group } from '../group/group.entity';
import { ExpenseSplit } from './expense-split.entity';
import { ExpensePayer } from './expense-payer.entity';

@Entity()
export class Expense {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  description: string;

  @Column('float')
  amount: number;

  @ManyToOne(() => Group, (group) => group.expenses)
  group: Group;
  @OneToMany(() => ExpenseSplit, (split) => split.expense, { cascade: true })
  splits: ExpenseSplit[];

  @OneToMany(() => ExpensePayer, (payer) => payer.expense, { cascade: true })
  paidBy: ExpensePayer[];
}
