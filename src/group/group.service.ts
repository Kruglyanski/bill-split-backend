import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
  forwardRef,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Group } from './group.entity';
import { Repository } from 'typeorm';
import { User } from '../user/user.entity';
import {
  GroupDebtResultDto,
  GroupDebtTransactionDto,
} from './dto/group-debt-result.dto';
import { CreateGroupDto } from './dto/create-group.dto';
import { UpdateGroupDto } from './dto/update-group.dto';
import { AppGateway } from '../gateway/app.gateway';
import { WS_EVENTS } from '../gateway/events';

@Injectable()
export class GroupService {
  constructor(
    @InjectRepository(Group)
    private groupRepo: Repository<Group>,
    @InjectRepository(User)
    private userRepo: Repository<User>,
    @Inject(forwardRef(() => AppGateway))
    private readonly gateway: AppGateway,
  ) {}

  async createGroup({ name, userIds }: CreateGroupDto) {
    const users = await this.userRepo.findByIds(userIds); //TODO: ref

    if (users.length !== userIds.length) {
      throw new NotFoundException('One or more users not found');
    }

    // const createdExtraUsers: User[] = [];
    // for (const extraUser of extraUsers) {
    //   const existingUser = await this.userRepo.findOne({
    //     where: { email: extraUser.email },
    //   });

    //   if (existingUser) {
    //     throw new BadRequestException(
    //       `Пользователь с email ${extraUser.email} уже зарегистрирован`,
    //     );
    //   }

    //   const newUser = this.userRepo.create({
    //     name: extraUser.name,
    //     email: extraUser.email,
    //     registered: false,
    //     password: '',
    //   });

    //   await this.userRepo.save(newUser);

    //   createdExtraUsers.push(newUser);

    //   // TODO: отправить приглашение по email (если требуется)
    // }

    // const allUsers = [...users, ...createdExtraUsers];

    const createdGroup = this.groupRepo.create({
      name,
      members: users,
    });

    const group = await this.groupRepo.save(createdGroup);

    const membersIds = group.members.map((m) => m.id);
    this.gateway.addUsersToGroupRoom(membersIds, group.id);
    this.gateway.notifyUsers(membersIds, WS_EVENTS.GROUP_CREATED, { group });

    return group;
  }

  async updateGroup(id: number, dto: UpdateGroupDto) {
    const group = await this.groupRepo.findOne({
      where: { id },
      relations: ['members'],
    });

    if (!group) {
      throw new NotFoundException('Группа не найдена');
    }

    const users = await this.userRepo.findByIds(dto.userIds);
    if (users.length !== dto.userIds.length) {
      throw new NotFoundException(
        'Один или несколько пользователей не найдены',
      );
    }

    const createdExtraUsers: User[] = [];
    for (const extraUser of dto.extraUsers) {
      const existingUser = await this.userRepo.findOne({
        where: { email: extraUser.email },
      });

      if (existingUser) {
        throw new BadRequestException(
          `Пользователь с email ${extraUser.email} уже зарегистрирован`,
        );
      }

      const newUser = this.userRepo.create({
        name: extraUser.name,
        email: extraUser.email,
        registered: false,
        password: '',
      });

      await this.userRepo.save(newUser);
      createdExtraUsers.push(newUser);

      // TODO: отправить приглашение по email (если надо)
    }

    group.name = dto.name;

    group.members = [...users, ...createdExtraUsers];

    await this.groupRepo.save(group);

    const membersIds = group.members.map((m) => m.id);

    this.gateway.addUsersToGroupRoom(membersIds, group.id);
    this.gateway.notifyUsers(membersIds, WS_EVENTS.ADDED_TO_GROUP, { group });

    return this.groupRepo.findOne({
      where: { id },
      relations: ['members'],
    });
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
