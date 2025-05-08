import {
  Entity,
  PrimaryGeneratedColumn,
  ManyToOne,
  Column,
  CreateDateColumn,
} from 'typeorm';
import { User } from '../user/user.entity';
import { Expense } from './expense.entity';

@Entity()
export class ExpenseHistory {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => Expense, { onDelete: 'CASCADE' })
  expense: Expense;

  @ManyToOne(() => User)
  user: User;

  @Column()
  action: 'created' | 'updated' | 'deleted';

  @Column({ type: 'jsonb', nullable: true })
  previousData?: any;

  @Column({ type: 'jsonb', nullable: true })
  newData?: any;

  @CreateDateColumn()
  createdAt: Date;
}
