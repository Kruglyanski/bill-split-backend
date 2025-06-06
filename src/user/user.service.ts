import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './user.entity';
// import { Group } from '../group/group.entity';

@Injectable()
export class UserService {
  constructor(
    @InjectRepository(User)
    private userRepo: Repository<User>,
    // @InjectRepository(Group)
    // private groupRepo: Repository<Group>,
  ) {}

  async create(data: Partial<User>): Promise<User> {
    const user = this.userRepo.create(data);
    return this.userRepo.save(user);
  }

  async findByEmail(email: string): Promise<User | null> {
    return this.userRepo.findOne({ where: { email } });
  }

  async findById(id: number): Promise<User | null> {
    return this.userRepo.findOne({ where: { id } });
  }

  async findByConfirmationToken(token: string): Promise<User | null> {
    return this.userRepo.findOne({ where: { emailConfirmationToken: token } });
  }

  async findAll(): Promise<User[]> {
    return this.userRepo.find();
  }

  async findRelatedUsers(userId: number): Promise<User[]> {
    const user = await this.userRepo.findOne({
      where: { id: userId },
      relations: ['groups'],
    });

    if (!user) throw new NotFoundException('User not found');

    const groupIds = user.groups.map((g) => g.id);
    if (groupIds.length === 0) {
      console.log('User has no groups');
      return [];
    }

    const users = this.userRepo
      .createQueryBuilder('user')
      .innerJoin('user.groups', 'group')
      .where('group.id IN (:...groupIds)', { groupIds })
      .orderBy('user.createdAt', 'DESC')
      .getMany();

    return users;
  }

  async findAllWithPagination(
    skip: number = 0,
    take: number = 10,
  ): Promise<[User[], number]> {
    return this.userRepo.findAndCount({
      skip,
      take,
    });
  }

  async findByGoogleId(googleId: string) {
    return this.userRepo.findOne({ where: { googleId } });
  }

  async update(id: number, updateData: Partial<User>) {
    await this.userRepo.update(id, updateData);
    return this.userRepo.findOne({ where: { id } });
  }
}
