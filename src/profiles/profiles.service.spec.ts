import { ConflictException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UserRole } from '../users/entities/user.entity';
import { Profile } from './entities/profile.entity';
import { ProfilesService, RequestUser } from './profiles.service';

const mockRepo = () => ({
  findOneBy: jest.fn(),
  findOne: jest.fn(),
  find: jest.fn(),
  create: jest.fn(),
  save: jest.fn(),
  remove: jest.fn(),
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
