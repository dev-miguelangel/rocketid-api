import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './entities/user.entity';
import { Profile } from '../profiles/entities/profile.entity';
import { UpdateOnboardingDto } from './dto/update-onboarding.dto';

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
    @InjectRepository(Profile)
    private readonly profileRepository: Repository<Profile>,
  ) {}

  async findById(id: string): Promise<User | null> {
    return this.userRepository.findOneBy({ id });
  }

  async findByIdWithProfile(id: string): Promise<User | null> {
    return this.userRepository.findOne({
      where: { id },
      relations: ['profile'],
    });
  }

  async findByEmail(email: string): Promise<User | null> {
    return this.userRepository.findOneBy({ email });
  }

  async updateRefreshToken(id: string, hash: string | null): Promise<void> {
    await this.userRepository.update(id, { refreshTokenHash: hash });
  }

  async findOrCreate(input: FindOrCreateInput): Promise<User> {
    await this.userRepository
      .createQueryBuilder()
      .insert()
      .into(User)
      .values(input)
      .orIgnore()
      .execute();
    return this.userRepository.findOneByOrFail({ googleId: input.googleId });
  }

  async updateOnboarding(
    userId: string,
    dto: UpdateOnboardingDto,
  ): Promise<Profile> {
    const user = await this.userRepository.findOneBy({ id: userId });
    if (!user) {
      throw new Error('Usuario no encontrado');
    }

    const profile = await this.profileRepository.findOne({
      where: { user: { id: userId } },
      relations: ['user'],
    });

    if (!profile) {
      throw new Error('Perfil no encontrado');
    }

    const updateData: Partial<Profile> = {};

    if (dto.phone !== undefined) updateData.phone = dto.phone;
    if (dto.birthDate !== undefined) updateData.birthDate = dto.birthDate;
    if (dto.gender !== undefined) updateData.gender = dto.gender;
    if (dto.city !== undefined) updateData.city = dto.city;
    if (dto.bloodType !== undefined) updateData.bloodType = dto.bloodType;
    if (dto.allergies !== undefined) updateData.allergies = dto.allergies;
    if (dto.conditions !== undefined) updateData.conditions = dto.conditions;
    if (dto.medications !== undefined) updateData.medications = dto.medications;
    if (dto.emergencyContactName !== undefined)
      updateData.emergencyContactName = dto.emergencyContactName;
    if (dto.emergencyContactPhone !== undefined)
      updateData.emergencyContactPhone = dto.emergencyContactPhone;
    if (dto.emergencyContactRelationship !== undefined)
      updateData.emergencyContactRelationship =
        dto.emergencyContactRelationship;

    await this.profileRepository.update(profile.id, updateData);

    const newStep = Math.min(user.onboardingStep + 1, 3);
    await this.userRepository.update(userId, { onboardingStep: newStep });

    return this.profileRepository.findOneByOrFail({ id: profile.id });
  }
}
