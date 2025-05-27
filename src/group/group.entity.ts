import { Entity, PrimaryGeneratedColumn, Column, ManyToMany, JoinTable, OneToMany, CreateDateColumn } from 'typeorm';
import { User } from '../user/user.entity';
import { Expense } from '../expense/expense.entity';

@Entity()
export class Group {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  name: string;

  @ManyToMany(() => User, { eager: true })
  @JoinTable()
  members: User[];

  @OneToMany(() => Expense, expense => expense.group)
  expenses: Expense[];

  @CreateDateColumn()
  createdAt: Date;
}
