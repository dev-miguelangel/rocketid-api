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

const STRING_ID_LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
const STRING_ID_DIGITS = '123456789';
const MAX_GENERATION_ATTEMPTS = 10;

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

    const user = await this.userRepository.findOneByOrFail({
      googleId: input.googleId,
    });

    const existingProfile = await this.profileRepository.findOneBy({
      user: { id: user.id },
    });

    if (!existingProfile) {
      const stringId = await this.generateUniqueStringId();
      const profile = this.profileRepository.create({
        user: { id: user.id },
        alias: stringId,
        stringId,
      });
      await this.profileRepository.save(profile);
    }

    const userWithProfile = await this.userRepository.findOne({
      where: { id: user.id },
      relations: ['profile'],
    });
    if (!userWithProfile) {
      throw new Error('Error al recuperar el usuario con perfil');
    }
    return userWithProfile;
  }

  private async generateUniqueStringId(): Promise<string> {
    for (let attempt = 0; attempt < MAX_GENERATION_ATTEMPTS; attempt++) {
      const candidate = this.buildStringId();
      const exists = await this.profileRepository.findOneBy({
        stringId: candidate,
      });
      if (!exists) return candidate;
    }
    throw new Error('No se pudo generar un stringId único');
  }

  private buildStringId(): string {
    let result = '';
    for (let i = 0; i < 3; i++) {
      result +=
        STRING_ID_LETTERS[Math.floor(Math.random() * STRING_ID_LETTERS.length)];
    }
    for (let i = 0; i < 3; i++) {
      result +=
        STRING_ID_DIGITS[Math.floor(Math.random() * STRING_ID_DIGITS.length)];
    }
    return result;
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
