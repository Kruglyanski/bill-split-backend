import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToMany,
  CreateDateColumn,
} from 'typeorm';
import { Group } from '../group/group.entity';

@Entity()
export class User {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true })
  email: string;

  @Column()
  password: string;

  @Column()
  name: string;

  @Column({ nullable: true, unique: true })
  googleId?: string;

  @Column({ default: true })
  registered: boolean;

  @ManyToMany(() => Group, (group) => group.members)
  groups: Group[];

  @CreateDateColumn()
  createdAt: Date;

  @Column({ default: false })
  isEmailConfirmed: boolean;

  @Column({ type: 'varchar', nullable: true })
  emailConfirmationToken: string | null;

  @Column({ type: 'timestamp', nullable: true })
  emailConfirmationTokenExpires: Date | null;

  @Column({type: 'varchar', nullable: true })
  hashedRt?: string | null;          
}
