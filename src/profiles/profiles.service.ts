import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UserRole } from '../users/entities/user.entity';
import { CreateProfileDto } from './dto/create-profile.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { Profile } from './entities/profile.entity';

const STRING_ID_LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
const STRING_ID_DIGITS = '123456789';
const MAX_GENERATION_ATTEMPTS = 10;

export interface RequestUser {
  id: string;
  email: string;
  name: string;
  role: UserRole;
}

@Injectable()
export class ProfilesService {
  constructor(
    @InjectRepository(Profile)
    private readonly profileRepository: Repository<Profile>,
  ) {}

  async create(userId: string, dto: CreateProfileDto): Promise<Profile> {
    const alias = dto.alias.toLowerCase();

    const [existingAlias, existingProfile] = await Promise.all([
      this.profileRepository.findOneBy({ alias }),
      this.profileRepository.findOneBy({ userId }),
    ]);

    if (existingAlias) {
      throw new ConflictException('El alias ya está en uso');
    }
    if (existingProfile) {
      throw new ConflictException('El usuario ya tiene un perfil creado');
    }

    const stringId = await this.generateUniqueStringId();

    const profile = this.profileRepository.create({
      userId,
      phone: dto.phone ?? null,
      alias,
      stringId,
    });

    return this.profileRepository.save(profile);
  }

  async findAll(): Promise<Profile[]> {
    return this.profileRepository.find({ relations: ['user'] });
  }

  async findOne(id: string): Promise<Profile> {
    const profile = await this.profileRepository.findOne({
      where: { id },
      relations: ['user'],
    });
    if (!profile) {
      throw new NotFoundException('Perfil no encontrado');
    }
    return profile;
  }

  async findByAlias(alias: string): Promise<Profile> {
    const profile = await this.profileRepository.findOne({
      where: { alias: alias.toLowerCase() },
      relations: ['user'],
    });
    if (!profile) {
      throw new NotFoundException('Perfil no encontrado');
    }
    return profile;
  }

  async update(id: string, dto: UpdateProfileDto, requester: RequestUser): Promise<Profile> {
    const profile = await this.findOne(id);

    if (profile.userId !== requester.id && requester.role !== UserRole.ADMIN) {
      throw new ForbiddenException('No tienes permiso para modificar este perfil');
    }

    if (dto.alias !== undefined) {
      const alias = dto.alias.toLowerCase();
      const existing = await this.profileRepository.findOneBy({ alias });
      if (existing && existing.id !== id) {
        throw new ConflictException('El alias ya está en uso');
      }
      profile.alias = alias;
    }

    if (dto.phone !== undefined) {
      profile.phone = dto.phone;
    }

    return this.profileRepository.save(profile);
  }

  async remove(id: string, requester: RequestUser): Promise<void> {
    const profile = await this.findOne(id);

    if (profile.userId !== requester.id && requester.role !== UserRole.ADMIN) {
      throw new ForbiddenException('No tienes permiso para eliminar este perfil');
    }

    await this.profileRepository.remove(profile);
  }

  async addContact(userId: string, contactAlias: string): Promise<Profile> {
    const alias = contactAlias.replace(/^@/, '').toLowerCase();

    const [ownerProfile, contactProfile] = await Promise.all([
      this.profileRepository.findOne({ where: { userId }, relations: ['contacts'] }),
      this.profileRepository.findOneBy({ alias }),
    ]);

    if (!ownerProfile) throw new NotFoundException('Perfil no encontrado');
    if (!contactProfile) throw new NotFoundException('El alias no existe');
    if (ownerProfile.id === contactProfile.id) {
      throw new ConflictException('No puedes agregarte a ti mismo');
    }
    if (ownerProfile.contacts.some((c) => c.id === contactProfile.id)) {
      throw new ConflictException('El contacto ya está en tu lista');
    }

    ownerProfile.contacts.push(contactProfile);
    return this.profileRepository.save(ownerProfile);
  }

  async getContacts(userId: string): Promise<Profile[]> {
    const ownerProfile = await this.profileRepository.findOne({
      where: { userId },
      relations: ['contacts'],
    });
    if (!ownerProfile) throw new NotFoundException('Perfil no encontrado');
    return ownerProfile.contacts;
  }

  async getSuggestedContacts(userId: string): Promise<Profile[]> {
    const ownerProfile = await this.profileRepository.findOneBy({ userId });
    if (!ownerProfile) throw new NotFoundException('Perfil no encontrado');

    return this.profileRepository
      .createQueryBuilder('p')
      .innerJoin(
        'profile_contacts',
        'pc_added',
        'pc_added.owner_id = p.id AND pc_added.contact_id = :profileId',
      )
      .leftJoin(
        'profile_contacts',
        'pc_mine',
        'pc_mine.owner_id = :profileId AND pc_mine.contact_id = p.id',
      )
      .where('pc_mine.contact_id IS NULL')
      .setParameter('profileId', ownerProfile.id)
      .getMany();
  }

  private async generateUniqueStringId(): Promise<string> {
    for (let attempt = 0; attempt < MAX_GENERATION_ATTEMPTS; attempt++) {
      const candidate = this.buildStringId();
      const exists = await this.profileRepository.findOneBy({ stringId: candidate });
      if (!exists) return candidate;
    }
    throw new Error('No se pudo generar un stringId único');
  }

  private buildStringId(): string {
    let result = '';
    for (let i = 0; i < 3; i++) {
      result += STRING_ID_LETTERS[Math.floor(Math.random() * STRING_ID_LETTERS.length)];
    }
    for (let i = 0; i < 3; i++) {
      result += STRING_ID_DIGITS[Math.floor(Math.random() * STRING_ID_DIGITS.length)];
    }
    return result;
  }
}
