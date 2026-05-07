import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './entities/user.entity';

interface FindOrCreateInput {
  googleId: string;
  email: string;
  name: string;
  avatar?: string;
}

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  async findById(id: string): Promise<User | null> {
    return this.userRepository.findOneBy({ id });
  }

  async findByEmail(email: string): Promise<User | null> {
    return this.userRepository.findOneBy({ email });
  }

  async updateRefreshToken(id: string, hash: string | null): Promise<void> {
    await this.userRepository.update(id, { refreshTokenHash: hash });
  }

  async findOrCreate(input: FindOrCreateInput): Promise<User> {
    // INSERT ... ON CONFLICT DO NOTHING to handle concurrent requests for the same user
    await this.userRepository
      .createQueryBuilder()
      .insert()
      .into(User)
      .values(input)
      .orIgnore()
      .execute();
    return this.userRepository.findOneByOrFail({ googleId: input.googleId });
  }
}
