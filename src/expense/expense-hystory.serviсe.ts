import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { Expense } from './expense.entity';
import { ExpenseHistory } from './expense-hystory.entity';
import { User } from '../user/user.entity';
import { Group } from '../group/group.entity';

@Injectable()
export class ExpenseHistoryService {
  constructor(
    @InjectRepository(ExpenseHistory)
    private readonly historyRepo: Repository<ExpenseHistory>,
    @InjectRepository(Group)
    private readonly groupRepo: Repository<Group>,
  ) {}

  async logExpenseAction({
    expense,
    user,
    action,
    previousData,
    newData,
  }: {
    expense: Expense;
    user: User;
    action: 'created' | 'updated' | 'deleted';
    previousData?: any;
    newData?: any;
  }) {
    const history = this.historyRepo.create({
      expense,
      user,
      action,
      previousData,
      newData,
    });
    return this.historyRepo.save(history);
  }

  async findAllByUserId(userId: User['id']) {
    const userGroups = await this.groupRepo
      .createQueryBuilder('group')
      .leftJoin('group.members', 'user') // Соединяем с членами группы
      .where('user.id = :userId', { userId: userId })
      .getMany();

    // Извлекаем все ID групп, в которых состоит пользователь
    const groupIds = userGroups.map((group) => group.id);

    const history = await this.historyRepo
      .createQueryBuilder('history')
      .leftJoinAndSelect('history.expense', 'expense')
      .leftJoinAndSelect('history.user', 'user')
      .where('expense.groupId IN (:...groupIds)', { groupIds }) // Фильтруем по группам
      .getMany();

    return history;
  }

  async findByExpenseId(expenseId: number) {
    return this.historyRepo.find({
      where: { expense: { id: expenseId } },
      relations: ['user'],
      order: { createdAt: 'DESC' },
    });
  }
}
