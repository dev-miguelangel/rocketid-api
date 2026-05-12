import { ConflictException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ContactGroup } from './entities/contact-group.entity';
import { Profile } from './entities/profile.entity';
import { GroupsService } from './groups.service';

const mockGroupRepo = () => ({
  findOne: jest.fn(),
  find: jest.fn(),
  create: jest.fn(),
  save: jest.fn(),
  remove: jest.fn(),
});

const mockProfileRepo = () => ({
  findOneBy: jest.fn(),
  findOne: jest.fn(),
  find: jest.fn(),
});

describe('GroupsService', () => {
  let service: GroupsService;
  let groupRepo: jest.Mocked<Repository<ContactGroup>>;
  let profileRepo: jest.Mocked<Repository<Profile>>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GroupsService,
        { provide: getRepositoryToken(ContactGroup), useFactory: mockGroupRepo },
        { provide: getRepositoryToken(Profile), useFactory: mockProfileRepo },
      ],
    }).compile();

    service = module.get<GroupsService>(GroupsService);
    groupRepo = module.get(getRepositoryToken(ContactGroup));
    profileRepo = module.get(getRepositoryToken(Profile));
  });

  describe('create', () => {
    it('throws NotFoundException when profile not found', async () => {
      profileRepo.findOneBy.mockResolvedValue(null);

      await expect(
        service.create('user-1', { name: 'testgroup' }),
      ).rejects.toThrow(NotFoundException);
    });

    it('throws ConflictException when group name already exists', async () => {
      profileRepo.findOneBy.mockResolvedValue({ id: 'p-1' } as Profile);
      groupRepo.findOne.mockResolvedValue({ id: 'g-1' } as ContactGroup);

      await expect(
        service.create('user-1', { name: 'testgroup' }),
      ).rejects.toThrow(ConflictException);
    });

    it('creates group with valid data', async () => {
      profileRepo.findOneBy.mockResolvedValue({ id: 'p-1' } as Profile);
      groupRepo.findOne.mockResolvedValue(null);
      groupRepo.create.mockReturnValue({ name: 'testgroup' } as ContactGroup);
      groupRepo.save.mockResolvedValue({ id: 'g-1', name: 'testgroup' } as ContactGroup);

      const result = await service.create('user-1', { name: 'testgroup' });

      expect(result.name).toBe('testgroup');
      expect(groupRepo.create).toHaveBeenCalled();
    });

    it('creates group with contacts when provided', async () => {
      const ownerProfile = { id: 'p-1', contacts: [{ id: 'p-2' }, { id: 'p-3' }] } as Profile;
      profileRepo.findOneBy.mockResolvedValue(ownerProfile);
      groupRepo.findOne.mockResolvedValue(null);
      profileRepo.findOne.mockResolvedValue(ownerProfile);
      groupRepo.create.mockReturnValue({ name: 'testgroup', contacts: [] } as ContactGroup);
      groupRepo.save.mockResolvedValue({ id: 'g-1', name: 'testgroup' } as ContactGroup);

      const result = await service.create('user-1', {
        name: 'testgroup',
        contactIds: ['p-2'],
      });

      expect(result).toBeDefined();
    });
  });

  describe('findAll', () => {
    it('throws NotFoundException when profile not found', async () => {
      profileRepo.findOneBy.mockResolvedValue(null);

      await expect(service.findAll('user-1')).rejects.toThrow(NotFoundException);
    });

    it('returns groups for user', async () => {
      profileRepo.findOneBy.mockResolvedValue({ id: 'p-1' } as Profile);
      const groups = [{ id: 'g-1' }, { id: 'g-2' }] as ContactGroup[];
      groupRepo.find.mockResolvedValue(groups);

      const result = await service.findAll('user-1');

      expect(result).toHaveLength(2);
    });
  });

  describe('findOne', () => {
    it('throws NotFoundException when group not found', async () => {
      profileRepo.findOneBy.mockResolvedValue({ id: 'p-1' } as Profile);
      groupRepo.findOne.mockResolvedValue(null);

      await expect(service.findOne('user-1', 'g-1')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('returns group when found', async () => {
      profileRepo.findOneBy.mockResolvedValue({ id: 'p-1' } as Profile);
      const group = { id: 'g-1', name: 'testgroup' } as ContactGroup;
      groupRepo.findOne.mockResolvedValue(group);

      const result = await service.findOne('user-1', 'g-1');

      expect(result.id).toBe('g-1');
    });
  });

  describe('update', () => {
    it('throws ConflictException when updating to existing name', async () => {
      const ownerProfile = { id: 'p-1' } as Profile;
      profileRepo.findOneBy.mockResolvedValue(ownerProfile);
      const existingGroup = { id: 'g-1', owner: { id: 'p-1' }, name: 'existing' } as ContactGroup;
      groupRepo.findOne
        .mockResolvedValueOnce(existingGroup)
        .mockResolvedValueOnce({ id: 'g-2', owner: { id: 'p-1' }, name: 'existing' } as ContactGroup);

      await expect(
        service.update('user-1', 'g-1', { name: 'existing' }),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('remove', () => {
    it('removes group successfully', async () => {
      profileRepo.findOneBy.mockResolvedValue({ id: 'p-1' } as Profile);
      const group = { id: 'g-1', name: 'testgroup' } as ContactGroup;
      groupRepo.findOne.mockResolvedValue(group);
      groupRepo.remove.mockResolvedValue(group);

      await service.remove('user-1', 'g-1');

      expect(groupRepo.remove).toHaveBeenCalledWith(group);
    });
  });

  describe('addContacts', () => {
    it('throws NotFoundException for invalid contacts', async () => {
      profileRepo.findOneBy.mockResolvedValue({ id: 'p-1' } as Profile);
      const group = { id: 'g-1', contacts: [] } as ContactGroup;
      groupRepo.findOne.mockResolvedValue(group);
      profileRepo.findOne.mockResolvedValue({ id: 'p-1', contacts: [] } as Profile);

      await expect(
        service.addContacts('user-1', 'g-1', ['invalid-id']),
      ).rejects.toThrow(NotFoundException);
    });

    it('adds valid contacts to group', async () => {
      profileRepo.findOneBy.mockResolvedValue({ id: 'p-1' } as Profile);
      const group = { id: 'g-1', contacts: [{ id: 'p-2' }] } as ContactGroup;
      groupRepo.findOne.mockResolvedValue(group);
      profileRepo.findOne.mockResolvedValue({
        id: 'p-1',
        contacts: [{ id: 'p-2' }, { id: 'p-3' }],
      } as Profile);
      groupRepo.save.mockResolvedValue(group);

      const result = await service.addContacts('user-1', 'g-1', ['p-3']);

      expect(result).toBeDefined();
    });
  });

  describe('removeContacts', () => {
    it('removes contacts from group', async () => {
      profileRepo.findOneBy.mockResolvedValue({ id: 'p-1' } as Profile);
      const group = {
        id: 'g-1',
        contacts: [{ id: 'p-2' }, { id: 'p-3' }],
      } as ContactGroup;
      groupRepo.findOne.mockResolvedValue(group);
      groupRepo.save.mockResolvedValue({
        ...group,
        contacts: [{ id: 'p-2' }],
      });

      const result = await service.removeContacts('user-1', 'g-1', ['p-3']);

      expect(result.contacts).toHaveLength(1);
    });
  });
});