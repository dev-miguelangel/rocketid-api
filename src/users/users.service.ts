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

  async findOrCreate(input: FindOrCreateInput): Promise<User> {
    const existing = await this.userRepository.findOneBy({ googleId: input.googleId });
    if (existing) {
      return existing;
    }
    const user = this.userRepository.create(input);
    return this.userRepository.save(user);
  }
}
