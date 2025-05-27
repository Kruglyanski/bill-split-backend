import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Expense } from './expense.entity';
import { In, Repository } from 'typeorm';
import { CreateExpenseDto } from './dto/create-expense.dto';
import { Group } from '../group/group.entity';
import { User } from '../user/user.entity';
import { ExpenseSplit } from './expense-split.entity';
import { ExpensePayer } from './expense-payer.entity';
import { UpdateExpenseDto } from './dto/update-expense.dto';
import { ExpenseHistoryService } from './expense-hystory.serviсe';

@Injectable()
export class ExpenseService {
  constructor(
    @InjectRepository(Expense)
    private expenseRepo: Repository<Expense>,
    @InjectRepository(Group)
    private groupRepo: Repository<Group>,
    @InjectRepository(User)
    private userRepo: Repository<User>,
    @InjectRepository(ExpenseSplit)
    private splitRepo: Repository<ExpenseSplit>,
    @InjectRepository(ExpensePayer)
    private payerRepo: Repository<ExpensePayer>,
    private expenseHistoryService: ExpenseHistoryService,
  ) {}

  async create(dto: CreateExpenseDto, currentUserId: User['id']) {
    const group = await this.groupRepo.findOne({
      where: { id: dto.groupId },
      relations: ['members'],
    });
    if (!group) throw new NotFoundException('Group not found');

    const splits = await Promise.all(
      dto.splits.map(async (split) => {
        const user = await this.userRepo.findOne({
          where: { id: split.userId },
        });
        if (!user)
          throw new NotFoundException(`User ${split.userId} not found`);
        const s = new ExpenseSplit();
        s.user = user;
        s.amount = split.amount;
        return s;
      }),
    );

    const payers = await Promise.all(
      dto.paidByUsers.map(async (payer) => {
        const user = await this.userRepo.findOne({
          where: { id: payer.userId },
        });
        if (!user)
          throw new NotFoundException(`Payer ${payer.userId} not found`);

        const p = new ExpensePayer();
        p.user = user;
        p.amount = payer.amount;
        console.log(p);
        return p;
      }),
    );

    const expense = this.expenseRepo.create({
      description: dto.description,
      amount: dto.amount,
      group,
      paidBy: payers,
      splits,
    });

    const savedExpense = await this.expenseRepo.save(expense);
    const currentUser = await this.userRepo.findOne({
      where: { id: currentUserId },
    });

    if (currentUser) {
      await this.expenseHistoryService.logExpenseAction({
        expense: savedExpense,
        user: currentUser,
        action: 'created',
        previousData: {
          description: expense.description,
          amount: expense.amount,
          groupId: expense.group.id,
          paidBy: expense.paidBy,
          splits: expense.splits,
        },
      });
    }

    return savedExpense;
  }

  async getExpensesByUserId(userId: number) {
    const groups = await this.groupRepo
      .createQueryBuilder('group')
      .leftJoin('group.members', 'member')
      .where('member.id = :userId', { userId })
      .getMany();

    const groupIds = groups.map((g) => g.id);

    if (!groupIds.length) return [];

    return this.expenseRepo.find({
      where: { group: { id: In(groupIds) } },
      relations: ['group', 'splits', 'paidBy'],
      order: { createdAt: 'DESC' },
    });
  }

  //TODO: разобраться с лишней хренью
  async update(id: number, dto: UpdateExpenseDto, currentUserId: User['id']) {
    const expense = await this.expenseRepo.findOne({
      where: { id },
      relations: ['splits', 'paidBy', 'group'],
    });

    let previousExpenseData: any = null;

    if (expense) {
      previousExpenseData = {
        description: expense.description,
        amount: expense.amount,
        groupId: expense.group.id,
        paidBy: expense.paidBy,
        splits: expense.splits,
      };
    }

    if (!expense) throw new NotFoundException('Expense not found');

    // Проверяем сумму долей
    const totalSplit = dto.splits.reduce((sum, s) => sum + s.amount, 0);

    if (Math.abs(totalSplit - dto.amount) > 0.01) {
      throw new BadRequestException(
        `Сумма долей (${totalSplit}) не совпадает с общей суммой (${dto.amount})`,
      );
    }

    expense.description = dto.description;
    expense.amount = dto.amount;

    // Находим и назначаем группу
    const group = await this.groupRepo.findOneBy({ id: dto.groupId });
    if (!group) throw new NotFoundException('Group not found');
    expense.group = group;

    // Обновляем splits
    await this.splitRepo.delete({ expense: { id } });
    expense.splits = dto.splits.map((split) => {
      const newSplit = new ExpenseSplit();
      newSplit.user = { id: split.userId } as any;
      newSplit.amount = split.amount;
      return newSplit;
    });

    // Обновляем paidBy
    await this.payerRepo.delete({ expense: { id } });
    expense.paidBy = dto.paidBy.map((payer) => {
      const newPayer = new ExpensePayer();
      newPayer.user = { id: payer.userId } as any; //TODO
      newPayer.amount = payer.amount;
      return newPayer;
    });

    const savedExpense = await this.expenseRepo.save(expense);

    const res = await this.expenseRepo.findOne({
      where: { id },
      relations: ['group', 'splits', 'splits.user', 'paidBy', 'paidBy.user'],
    });

    const currentUser = await this.userRepo.findOne({
      where: { id: currentUserId },
    });

    if (currentUser) {
      await this.expenseHistoryService.logExpenseAction({
        expense: savedExpense,
        user: currentUser,
        action: 'updated',
        previousData: previousExpenseData,
        newData: {
          description: savedExpense.description,
          amount: savedExpense.amount,
          groupId: savedExpense.group.id,
          paidBy: savedExpense.paidBy,
          splits: savedExpense.splits,
        },
      });
    }

    return res;
  }

  async delete(id: number, currentUserId: User['id']) {
    const expense = await this.expenseRepo.findOne({
      where: { id },
      relations: ['splits', 'paidBy', 'group'],
    });

    if (!expense) {
      throw new NotFoundException('Expense not found');
    }

    const currentUser = await this.userRepo.findOne({
      where: { id: currentUserId },
    });

    if (currentUser) {
      await this.expenseHistoryService.logExpenseAction({
        expense,
        user: currentUser,
        action: 'deleted',
        previousData: {
          description: expense.description,
          amount: expense.amount,
          groupId: expense.group.id,
          paidBy: expense.paidBy,
          splits: expense.splits,
        },
      });
    }

    await this.splitRepo.delete({ expense: { id } });
    await this.payerRepo.delete({ expense: { id } });

    await this.expenseRepo.delete(id);

    return { message: 'Expense deleted successfully' };
  }

  async getGroupExpenses(groupId: number) {
    return this.expenseRepo.find({
      where: { group: { id: groupId } },
      relations: ['group', 'splits', 'paidBy'],
    });
  }

  async getBalances(groupId: number) {
    const expenses = await this.expenseRepo.find({
      where: { group: { id: groupId } },
      relations: ['splits', 'splits.user', 'paidBy'],
    });

    const balances: Record<
      number,
      { userId: number; paid: number; owed: number }
    > = {};

    for (const expense of expenses) {
      for (const payer of expense.paidBy) {
        const payerId = payer.user.id;
        if (!balances[payerId]) {
          balances[payerId] = { userId: payerId, paid: 0, owed: 0 };
        }
        balances[payerId].paid += payer.amount;
      }

      for (const split of expense.splits) {
        const uid = split.user.id;

        if (!balances[uid]) {
          balances[uid] = { userId: uid, paid: 0, owed: 0 };
        }

        balances[uid].owed += split.amount;
      }
    }

    return Object.values(balances).map((b) => ({
      ...b,
      balance: b.paid - b.owed,
    }));
  }

  async calculateSettlements(groupId: number) {
    const balances = await this.getBalances(groupId);

    const debtors = balances
      .filter((b) => b.balance < 0)
      .map((b) => ({ userId: b.userId, amount: -b.balance }))
      .sort((a, b) => a.amount - b.amount);

    const creditors = balances
      .filter((b) => b.balance > 0)
      .map((b) => ({ userId: b.userId, amount: b.balance }))
      .sort((a, b) => b.amount - a.amount);

    const settlements: { from: number; to: number; amount: number }[] = [];

    let i = 0;
    let j = 0;

    while (i < debtors.length && j < creditors.length) {
      const debtor = debtors[i];
      const creditor = creditors[j];

      const minAmount = Math.min(debtor.amount, creditor.amount);

      settlements.push({
        from: debtor.userId,
        to: creditor.userId,
        amount: Math.round(minAmount),
      });

      debtor.amount -= minAmount;
      creditor.amount -= minAmount;

      if (debtor.amount === 0) i++;
      if (creditor.amount === 0) j++;
    }

    return settlements;
  }
}
