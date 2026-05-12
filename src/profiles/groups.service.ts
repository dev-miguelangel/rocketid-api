import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { ContactGroup } from './entities/contact-group.entity';
import { Profile } from './entities/profile.entity';
import { CreateContactGroupDto } from './dto/create-contact-group.dto';
import { UpdateContactGroupDto } from './dto/update-contact-group.dto';
import { RequestUser } from './profiles.service';

@Injectable()
export class GroupsService {
  constructor(
    @InjectRepository(ContactGroup)
    private readonly groupRepository: Repository<ContactGroup>,
    @InjectRepository(Profile)
    private readonly profileRepository: Repository<Profile>,
  ) {}

  async create(userId: string, dto: CreateContactGroupDto): Promise<ContactGroup> {
    const ownerProfile = await this.profileRepository.findOneBy({
      user: { id: userId },
    });

    if (!ownerProfile) {
      throw new NotFoundException('Perfil no encontrado');
    }

    const existingGroup = await this.groupRepository.findOne({
      where: { owner: { id: ownerProfile.id }, name: dto.name.toLowerCase() },
    });

    if (existingGroup) {
      throw new ConflictException('Ya existe un grupo con este nombre');
    }

    const contacts: Profile[] = [];

    if (dto.contactIds && dto.contactIds.length > 0) {
      const validContacts = await this.validateContactIds(
        ownerProfile.id,
        dto.contactIds,
      );
      contacts.push(...validContacts);
    }

    const group = this.groupRepository.create({
      name: dto.name.toLowerCase(),
      owner: ownerProfile,
      contacts,
    });

    return this.groupRepository.save(group);
  }

  async findAll(userId: string): Promise<ContactGroup[]> {
    const ownerProfile = await this.profileRepository.findOneBy({
      user: { id: userId },
    });

    if (!ownerProfile) {
      throw new NotFoundException('Perfil no encontrado');
    }

    return this.groupRepository.find({
      where: { owner: { id: ownerProfile.id } },
      relations: ['contacts'],
      order: { createdAt: 'DESC' },
    });
  }

  async findOne(userId: string, groupId: string): Promise<ContactGroup> {
    const ownerProfile = await this.profileRepository.findOneBy({
      user: { id: userId },
    });

    if (!ownerProfile) {
      throw new NotFoundException('Perfil no encontrado');
    }

    const group = await this.groupRepository.findOne({
      where: { id: groupId, owner: { id: ownerProfile.id } },
      relations: ['contacts'],
    });

    if (!group) {
      throw new NotFoundException('Grupo no encontrado');
    }

    return group;
  }

  async update(
    userId: string,
    groupId: string,
    dto: UpdateContactGroupDto,
  ): Promise<ContactGroup> {
    const group = await this.findOne(userId, groupId);

    if (dto.name) {
      const existingGroup = await this.groupRepository.findOne({
        where: {
          owner: { id: group.owner.id },
          name: dto.name.toLowerCase(),
        },
      });

      if (existingGroup && existingGroup.id !== groupId) {
        throw new ConflictException('Ya existe un grupo con este nombre');
      }

      group.name = dto.name.toLowerCase();
    }

    return this.groupRepository.save(group);
  }

  async remove(userId: string, groupId: string): Promise<void> {
    const group = await this.findOne(userId, groupId);
    await this.groupRepository.remove(group);
  }

  async addContacts(
    userId: string,
    groupId: string,
    contactIds: string[],
  ): Promise<ContactGroup> {
    const group = await this.findOne(userId, groupId);
    const ownerProfile = await this.profileRepository.findOne({
      where: { user: { id: userId } },
      relations: ['contacts'],
    });

    if (!ownerProfile) {
      throw new NotFoundException('Perfil no encontrado');
    }

    const validContacts = await this.validateContactIds(
      ownerProfile.id,
      contactIds,
    );

    const existingContactIds = group.contacts.map((c) => c.id);
    const newContacts = validContacts.filter(
      (c) => !existingContactIds.includes(c.id),
    );

    group.contacts.push(...newContacts);
    return this.groupRepository.save(group);
  }

  async removeContacts(
    userId: string,
    groupId: string,
    contactIds: string[],
  ): Promise<ContactGroup> {
    const group = await this.findOne(userId, groupId);

    group.contacts = group.contacts.filter(
      (c) => !contactIds.includes(c.id),
    );

    return this.groupRepository.save(group);
  }

  private async validateContactIds(
    ownerProfileId: string,
    contactIds: string[],
  ): Promise<Profile[]> {
    const ownerProfile = await this.profileRepository.findOne({
      where: { id: ownerProfileId },
      relations: ['contacts'],
    });

    if (!ownerProfile) {
      throw new NotFoundException('Perfil no encontrado');
    }

    const validContactIds = ownerProfile.contacts.map((c) => c.id);
    const invalidIds = contactIds.filter((id) => !validContactIds.includes(id));

    if (invalidIds.length > 0) {
      throw new NotFoundException(
        `Los siguientes contactos no están en tu lista: ${invalidIds.join(', ')}`,
      );
    }

    return ownerProfile.contacts.filter((c) => contactIds.includes(c.id));
  }
}