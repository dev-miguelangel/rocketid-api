import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UsersService } from './users.service';
import { User, UserRole, UserStatus } from './entities/user.entity';
import { Profile } from '../profiles/entities/profile.entity';

const mockUser: User = {
  id: 'uuid-1',
  googleId: 'google-123',
  email: 'test@test.com',
  name: 'Test User',
  avatar: null,
  role: UserRole.USER,
  status: UserStatus.ACTIVE,
  onboardingStep: 0,
  refreshTokenHash: null,
  createdAt: new Date(),
  updatedAt: new Date(),
};

const mockProfile: Profile = {
  id: 'profile-uuid-1',
  userId: 'uuid-1',
  phone: null,
  alias: 'testuser',
  stringId: 'TEST01',
  birthDate: null,
  gender: null,
  city: null,
  bloodType: null,
  allergies: null,
  conditions: null,
  medications: null,
  emergencyContactName: null,
  emergencyContactPhone: null,
  emergencyContactRelationship: null,
  contacts: [],
  addedBy: [],
  user: mockUser,
  createdAt: new Date(),
  updatedAt: new Date(),
};

describe('UsersService', () => {
  let service: UsersService;
  let userRepo: jest.Mocked<Repository<User>>;
  let profileRepo: jest.Mocked<Repository<Profile>>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        {
          provide: getRepositoryToken(User),
          useValue: {
            findOneBy: jest.fn(),
            findOneByOrFail: jest.fn(),
            findOne: jest.fn(),
            create: jest.fn(),
            save: jest.fn(),
            update: jest.fn(),
            createQueryBuilder: jest.fn().mockReturnValue({
              insert: jest.fn().mockReturnValue({
                into: jest.fn().mockReturnValue({
                  values: jest.fn().mockReturnValue({
                    orIgnore: jest.fn().mockReturnValue({
                      execute: jest.fn().mockResolvedValue({}),
                    }),
                  }),
                }),
              }),
            }),
          },
        },
        {
          provide: getRepositoryToken(Profile),
          useValue: {
            findOne: jest.fn(),
            findOneBy: jest.fn(),
            findOneByOrFail: jest.fn(),
            create: jest.fn(),
            save: jest.fn(),
            update: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);
    userRepo = module.get(getRepositoryToken(User));
    profileRepo = module.get(getRepositoryToken(Profile));
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('findById', () => {
    it('should return user when found', async () => {
      userRepo.findOneBy.mockResolvedValue(mockUser);
      const result = await service.findById('uuid-1');
      expect(result).toEqual(mockUser);
      expect(userRepo.findOneBy).toHaveBeenCalledWith({ id: 'uuid-1' });
    });

    it('should return null when not found', async () => {
      userRepo.findOneBy.mockResolvedValue(null);
      const result = await service.findById('non-existent');
      expect(result).toBeNull();
    });
  });

  describe('findByEmail', () => {
    it('should return user when found', async () => {
      userRepo.findOneBy.mockResolvedValue(mockUser);
      const result = await service.findByEmail('test@test.com');
      expect(result).toEqual(mockUser);
      expect(userRepo.findOneBy).toHaveBeenCalledWith({
        email: 'test@test.com',
      });
    });
  });

  describe('findOrCreate', () => {
    it('should return existing user with profile if found', async () => {
      userRepo.findOneBy.mockResolvedValue(mockUser);
      userRepo.findOneByOrFail.mockResolvedValue(mockUser);
      profileRepo.findOneBy.mockResolvedValue(mockProfile);
      userRepo.findOne.mockResolvedValue({ ...mockUser, profile: mockProfile });

      const result = await service.findOrCreate({
        googleId: 'google-123',
        email: 'test@test.com',
        name: 'Test User',
      });
      expect(result).toEqual({ ...mockUser, profile: mockProfile });
      expect(profileRepo.create).not.toHaveBeenCalled();
    });

    it('should create user and profile when user does not exist', async () => {
      userRepo.createQueryBuilder.mockReturnValue({
        insert: jest.fn().mockReturnValue({
          into: jest.fn().mockReturnValue({
            values: jest.fn().mockReturnValue({
              orIgnore: jest.fn().mockReturnValue({
                execute: jest.fn().mockResolvedValue({}),
              }),
            }),
          }),
        }),
      });
      userRepo.findOneByOrFail.mockResolvedValue(mockUser);
      profileRepo.findOneBy.mockResolvedValue(null);
      profileRepo.create.mockImplementation((data) => data);
      profileRepo.save.mockImplementation((data) => ({
        ...data,
        id: mockProfile.id,
      }));

      const createdProfile = { id: 'new-profile-id', ...mockProfile };
      userRepo.findOne.mockResolvedValue({
        ...mockUser,
        profile: createdProfile,
      });

      const input = {
        googleId: 'google-123',
        email: 'test@test.com',
        name: 'Test User',
      };
      const result = await service.findOrCreate(input);

      const createCall = profileRepo.create.mock.calls[0][0];
      expect(result).toBeDefined();
      expect(result.profile).toBeDefined();
      expect(createCall.alias).toHaveLength(6);
      expect(createCall.stringId).toHaveLength(6);
      expect(createCall.alias).toBe(createCall.stringId);
      expect(profileRepo.save).toHaveBeenCalled();
    });
  });
});
