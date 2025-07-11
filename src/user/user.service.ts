import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './user.entity';
import { randomUUID } from 'crypto';
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

  async createWithFakeEmail(name: string): Promise<User> {
    const base = name.trim().toLowerCase().replace(/\s+/g, '_') || 'user';
    let email = `${base}_${randomUUID().slice(0, 6)}@fake.local`;

    while (await this.findByEmail(email)) {
      email = `${base}_${randomUUID().slice(0, 6)}@fake.local`;
    }

    const user = this.userRepo.create({
      name,
      email,
      registered: false,
      password: '',
    });

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

    const qb = this.userRepo
      .createQueryBuilder('user')
      .distinct(true)
      .leftJoin('user.groups', 'group')
      .where('user.id = :userId', { userId });

    if (groupIds.length) {
      qb.orWhere('group.id IN (:...groupIds)', { groupIds });
    }

    qb.select([
      'user.id',
      'user.name',
      'user.email',
      'user.createdAt',
      'user.registered',
    ]);

    return qb.orderBy('user.createdAt', 'DESC').getMany();
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
