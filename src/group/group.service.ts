import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Group } from './group.entity';
import { Repository } from 'typeorm';
import { User } from '../user/user.entity';
import {
  GroupDebtResultDto,
  GroupDebtTransactionDto,
} from './dto/group-debt-result.dto';

@Injectable()
export class GroupService {
  constructor(
    @InjectRepository(Group)
    private groupRepo: Repository<Group>,
    @InjectRepository(User)
    private userRepo: Repository<User>,
  ) {}

  async create(name: string, userIds: number[]) {
    const users = await this.userRepo.findByIds(userIds);
    if (users.length !== userIds.length)
      throw new NotFoundException('One or more users not found');
    const group = this.groupRepo.create({ name, members: users });
    return this.groupRepo.save(group);
  }

  async findAllForUser(userId: number) {
    return this.groupRepo
      .createQueryBuilder('group')
      .leftJoinAndSelect('group.members', 'members')
      .leftJoin('group.members', 'user')
      .where('user.id = :userId', { userId })
      .getMany();
  }

  async calculateGroupDebts(
    groupId: number,
    currentUserId: number,
  ): Promise<GroupDebtResultDto & { myPosition: any }> {
    const group = await this.groupRepo.findOne({
      where: { id: groupId },
      relations: ['members', 'expenses', 'expenses.splits', 'expenses.paidBy'],
    });

    if (!group) throw new NotFoundException('Group not found');

    const userMap = new Map<number, string>();
    for (const member of group.members) {
      userMap.set(member.id, member.name);
    }

    const balances: Record<number, number> = {};

    for (const expense of group.expenses) {
      for (const payer of expense.paidBy) {
        balances[payer.userId] = (balances[payer.userId] || 0) + payer.amount;
      }
      for (const split of expense.splits) {
        balances[split.userId] = (balances[split.userId] || 0) - split.amount;
      }
    }

    const debtors: { userId: number; balance: number }[] = [];
    const creditors: { userId: number; balance: number }[] = [];

    for (const [userId, balance] of Object.entries(balances)) {
      const uid = parseInt(userId);
      if (balance < -0.01) debtors.push({ userId: uid, balance });
      else if (balance > 0.01) creditors.push({ userId: uid, balance });
    }

    const transactions: GroupDebtTransactionDto[] = [];

    for (const debtor of debtors) {
      let debt = -debtor.balance;
      for (const creditor of creditors) {
        if (debt === 0) break;
        const available = creditor.balance;

        const pay = Math.min(debt, available);
        if (pay > 0.01) {
          transactions.push({
            fromUserId: debtor.userId,
            fromUserName: userMap.get(debtor.userId) || 'Unknown',
            toUserId: creditor.userId,
            toUserName: userMap.get(creditor.userId) || 'Unknown',
            amount: parseFloat(pay.toFixed(2)),
          });
          creditor.balance -= pay;
          debt -= pay;
        }
      }
    }

    const balancesArray = Object.entries(balances).map(([id, balance]) => ({
      userId: +id,
      userName: userMap.get(+id) || 'Unknown',
      balance: parseFloat(balance.toFixed(2)),
    }));

    // вычисляем позицию текущего пользователя
    let totalOwed = 0;
    let totalToReceive = 0;

    for (const tx of transactions) {
      if (tx.fromUserId === currentUserId) totalOwed += tx.amount;
      if (tx.toUserId === currentUserId) totalToReceive += tx.amount;
    }

    return {
      balances: balancesArray,
      transactions,
      myPosition: {
        totalOwed: +totalOwed.toFixed(2),
        totalToReceive: +totalToReceive.toFixed(2),
        netBalance: +(totalToReceive - totalOwed).toFixed(2),
      },
    };
  }
}
