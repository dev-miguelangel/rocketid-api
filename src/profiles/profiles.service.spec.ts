import { BadRequestException, ConflictException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UserRole } from '../users/entities/user.entity';
import { Profile } from './entities/profile.entity';
import { ProfilesService, RequestUser } from './profiles.service';

const buildQb = (): any => ({
  innerJoin: jest.fn().mockReturnThis(),
  leftJoin: jest.fn().mockReturnThis(),
  leftJoinAndSelect: jest.fn().mockReturnThis(),
  where: jest.fn().mockReturnThis(),
  orWhere: jest.fn().mockReturnThis(),
  andWhere: jest.fn().mockReturnThis(),
  setParameter: jest.fn().mockReturnThis(),
  getOne: jest.fn(),
  getMany: jest.fn(),
});

const mockRepo = () => ({
  findOneBy: jest.fn(),
  findOne: jest.fn(),
  find: jest.fn(),
  create: jest.fn(),
  save: jest.fn(),
  remove: jest.fn(),
  createQueryBuilder: jest.fn(),
});

const adminUser: RequestUser = { id: 'admin-1', email: 'a@a.com', name: 'Admin', role: UserRole.ADMIN };
const regularUser: RequestUser = { id: 'user-1', email: 'u@u.com', name: 'User', role: UserRole.USER };

describe('ProfilesService', () => {
  let service: ProfilesService;
  let repo: jest.Mocked<Repository<Profile>>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProfilesService,
        { provide: getRepositoryToken(Profile), useFactory: mockRepo },
      ],
    }).compile();

    service = module.get(ProfilesService);
    repo = module.get(getRepositoryToken(Profile));
  });

  // ── create ────────────────────────────────────────────────────────────────

  describe('create', () => {
    it('throws ConflictException when alias is taken', async () => {
      repo.findOneBy.mockResolvedValueOnce({ alias: 'taken' } as Profile);
      repo.findOneBy.mockResolvedValueOnce(null);

      await expect(service.create('user-1', { alias: 'Taken' })).rejects.toThrow(ConflictException);
    });

    it('throws ConflictException when user already has a profile', async () => {
      repo.findOneBy.mockResolvedValueOnce(null);
      repo.findOneBy.mockResolvedValueOnce({ userId: 'user-1' } as Profile);

      await expect(service.create('user-1', { alias: 'newAlias' })).rejects.toThrow(ConflictException);
    });

    it('normalizes alias to lowercase and saves profile', async () => {
      repo.findOneBy.mockResolvedValue(null);
      const saved = { id: 'p-1', alias: 'myalias', stringId: 'ABC123' } as Profile;
      repo.create.mockReturnValue(saved);
      repo.save.mockResolvedValue(saved);

      const result = await service.create('user-1', { alias: 'MyAlias' });

      expect(repo.create).toHaveBeenCalledWith(expect.objectContaining({ alias: 'myalias' }));
      expect(result).toBe(saved);
    });

    it('generates stringId matching [A-Z]{3}[1-9]{3}', async () => {
      repo.findOneBy.mockResolvedValue(null);
      let captured = '';
      repo.create.mockImplementation((data) => {
        captured = (data as Partial<Profile>).stringId ?? '';
        return data as Profile;
      });
      repo.save.mockImplementation((p) => Promise.resolve(p as Profile));

      await service.create('user-1', { alias: 'testuser' });

      expect(captured).toMatch(/^[A-Z]{3}[1-9]{3}$/);
    });
  });

  // ── findAll ───────────────────────────────────────────────────────────────

  describe('findAll', () => {
    it('returns all profiles', async () => {
      const profiles = [{ id: 'p-1' }, { id: 'p-2' }] as Profile[];
      repo.find.mockResolvedValue(profiles);

      const result = await service.findAll();

      expect(repo.find).toHaveBeenCalledWith({ relations: ['user'] });
      expect(result).toBe(profiles);
    });
  });

  // ── findOne ───────────────────────────────────────────────────────────────

  describe('findOne', () => {
    it('returns a profile by id', async () => {
      const profile = { id: 'p-1' } as Profile;
      repo.findOne.mockResolvedValue(profile);

      const result = await service.findOne('p-1');

      expect(result).toBe(profile);
    });

    it('throws NotFoundException when not found', async () => {
      repo.findOne.mockResolvedValue(null);

      await expect(service.findOne('missing')).rejects.toThrow(NotFoundException);
    });
  });

  // ── search ────────────────────────────────────────────────────────────────

  describe('search', () => {
    it('throws BadRequestException when query is empty', async () => {
      await expect(service.search('')).rejects.toThrow(BadRequestException);
    });

    it('throws NotFoundException when no profile matches', async () => {
      const qb = buildQb();
      qb.getOne.mockResolvedValue(null);
      repo.createQueryBuilder.mockReturnValue(qb);

      await expect(service.search('ghost')).rejects.toThrow(NotFoundException);
    });

    it('strips @ and builds OR query by alias, stringId and email', async () => {
      const profile = { id: 'p-1', alias: 'myalias' } as Profile;
      const qb = buildQb();
      qb.getOne.mockResolvedValue(profile);
      repo.createQueryBuilder.mockReturnValue(qb);

      const result = await service.search('@MyAlias');

      expect(qb.where).toHaveBeenCalledWith('profile.alias = :alias', { alias: 'myalias' });
      expect(qb.orWhere).toHaveBeenCalledWith('profile.stringId = :stringId', { stringId: 'MYALIAS' });
      expect(qb.orWhere).toHaveBeenCalledWith('user.email = :email', { email: 'myalias' });
      expect(result).toBe(profile);
    });
  });

  // ── findByAlias ───────────────────────────────────────────────────────────

  describe('findByAlias', () => {
    it('returns profile searching by lowercased alias', async () => {
      const profile = { id: 'p-1', alias: 'myalias' } as Profile;
      repo.findOne.mockResolvedValue(profile);

      const result = await service.findByAlias('MyAlias');

      expect(repo.findOne).toHaveBeenCalledWith(expect.objectContaining({ where: { alias: 'myalias' } }));
      expect(result).toBe(profile);
    });

    it('throws NotFoundException when alias does not exist', async () => {
      repo.findOne.mockResolvedValue(null);

      await expect(service.findByAlias('ghost')).rejects.toThrow(NotFoundException);
    });
  });

  // ── update ────────────────────────────────────────────────────────────────

  describe('update', () => {
    const existingProfile = { id: 'p-1', userId: 'user-1', alias: 'old', phone: null } as Profile;

    beforeEach(() => {
      repo.findOne.mockResolvedValue(existingProfile);
    });

    it('throws ForbiddenException when requester does not own the profile', async () => {
      const other: RequestUser = { ...regularUser, id: 'other-user' };

      await expect(service.update('p-1', { alias: 'new' }, other)).rejects.toThrow(ForbiddenException);
    });

    it('allows admin to update any profile', async () => {
      repo.findOneBy.mockResolvedValue(null);
      repo.save.mockResolvedValue({ ...existingProfile, alias: 'updated' } as Profile);

      await expect(service.update('p-1', { alias: 'Updated' }, adminUser)).resolves.not.toThrow();
    });

    it('throws ConflictException when alias is taken by another profile', async () => {
      repo.findOneBy.mockResolvedValue({ id: 'p-2', alias: 'taken' } as Profile);

      await expect(service.update('p-1', { alias: 'taken' }, regularUser)).rejects.toThrow(ConflictException);
    });

    it('normalizes alias to lowercase on update', async () => {
      repo.findOneBy.mockResolvedValue(null);
      repo.save.mockImplementation((p) => Promise.resolve(p as Profile));

      const result = await service.update('p-1', { alias: 'NewAlias' }, regularUser);

      expect(result.alias).toBe('newalias');
    });
  });

  // ── addContact ────────────────────────────────────────────────────────────

  describe('addContact', () => {
    const contactProfile = { id: 'p-2', stringId: 'ABC123' } as Profile;
    let ownerProfile: Profile;

    beforeEach(() => {
      ownerProfile = { id: 'p-1', userId: 'user-1', contacts: [] } as unknown as Profile;
      repo.findOne.mockResolvedValue(ownerProfile);
      repo.findOneBy.mockResolvedValue(contactProfile);
      repo.save.mockImplementation((p) => Promise.resolve(p as Profile));
    });

    it('uppercases stringId before lookup', async () => {
      await service.addContact('user-1', 'abc123');

      expect(repo.findOneBy).toHaveBeenCalledWith({ stringId: 'ABC123' });
    });

    it('throws NotFoundException when owner has no profile', async () => {
      repo.findOne.mockResolvedValue(null);

      await expect(service.addContact('ghost', 'ABC123')).rejects.toThrow(NotFoundException);
    });

    it('throws NotFoundException when stringId does not exist', async () => {
      repo.findOneBy.mockResolvedValue(null);

      await expect(service.addContact('user-1', 'ZZZ999')).rejects.toThrow(NotFoundException);
    });

    it('throws ConflictException when adding self', async () => {
      repo.findOneBy.mockResolvedValue(ownerProfile);

      await expect(service.addContact('user-1', 'ABC123')).rejects.toThrow(ConflictException);
    });

    it('throws ConflictException when contact is already added', async () => {
      const ownerWithContact = { ...ownerProfile, contacts: [contactProfile] } as unknown as Profile;
      repo.findOne.mockResolvedValue(ownerWithContact);

      await expect(service.addContact('user-1', 'ABC123')).rejects.toThrow(ConflictException);
    });

    it('pushes contact and saves', async () => {
      const result = await service.addContact('user-1', 'ABC123');

      expect(repo.save).toHaveBeenCalled();
      expect(result.contacts).toContain(contactProfile);
    });
  });

  // ── getContacts ───────────────────────────────────────────────────────────

  describe('getContacts', () => {
    it('returns contacts list for the owner', async () => {
      const contacts = [{ id: 'p-2' }] as Profile[];
      repo.findOne.mockResolvedValue({ id: 'p-1', userId: 'user-1', contacts } as unknown as Profile);

      const result = await service.getContacts('user-1');

      expect(repo.findOne).toHaveBeenCalledWith(expect.objectContaining({ where: { userId: 'user-1' }, relations: ['contacts'] }));
      expect(result).toBe(contacts);
    });

    it('throws NotFoundException when owner has no profile', async () => {
      repo.findOne.mockResolvedValue(null);

      await expect(service.getContacts('ghost')).rejects.toThrow(NotFoundException);
    });
  });

  // ── getSuggestedContacts ──────────────────────────────────────────────────

  describe('getSuggestedContacts', () => {
    it('throws NotFoundException when owner has no profile', async () => {
      repo.findOneBy.mockResolvedValue(null);

      await expect(service.getSuggestedContacts('ghost')).rejects.toThrow(NotFoundException);
    });

    it('uses QueryBuilder with LEFT JOIN null check and returns results', async () => {
      const ownerProfile = { id: 'p-1', userId: 'user-1' } as Profile;
      const suggestions = [{ id: 'p-3' }] as Profile[];
      const qb = buildQb();
      qb.getMany.mockResolvedValue(suggestions);

      repo.findOneBy.mockResolvedValue(ownerProfile);
      repo.createQueryBuilder.mockReturnValue(qb);

      const result = await service.getSuggestedContacts('user-1');

      expect(repo.createQueryBuilder).toHaveBeenCalledWith('p');
      expect(qb.innerJoin).toHaveBeenCalled();
      expect(qb.leftJoin).toHaveBeenCalled();
      expect(qb.where).toHaveBeenCalledWith('pc_mine.contact_id IS NULL');
      expect(qb.setParameter).toHaveBeenCalledWith('profileId', 'p-1');
      expect(result).toBe(suggestions);
    });
  });

  // ── remove ────────────────────────────────────────────────────────────────

  describe('remove', () => {
    const existingProfile = { id: 'p-1', userId: 'user-1' } as Profile;

    beforeEach(() => {
      repo.findOne.mockResolvedValue(existingProfile);
      repo.remove.mockResolvedValue(existingProfile);
    });

    it('throws ForbiddenException when requester does not own the profile', async () => {
      const other: RequestUser = { ...regularUser, id: 'other-user' };

      await expect(service.remove('p-1', other)).rejects.toThrow(ForbiddenException);
    });

    it('allows owner to delete their profile', async () => {
      await expect(service.remove('p-1', regularUser)).resolves.toBeUndefined();
      expect(repo.remove).toHaveBeenCalledWith(existingProfile);
    });

    it('allows admin to delete any profile', async () => {
      await expect(service.remove('p-1', adminUser)).resolves.toBeUndefined();
      expect(repo.remove).toHaveBeenCalledWith(existingProfile);
    });
  });
});
