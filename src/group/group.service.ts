import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Group } from './group.entity';
import { Repository } from 'typeorm';
import { User } from '../user/user.entity';

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
    if (users.length !== userIds.length) throw new NotFoundException('One or more users not found');
    const group = this.groupRepo.create({ name, members: users });
    return this.groupRepo.save(group);
  }

  async findAllForUser(userId: number) {
    return this.groupRepo
      .createQueryBuilder('group')
      .leftJoinAndSelect('group.members', 'user')
      .where('user.id = :userId', { userId })
      .getMany();
  }
}
