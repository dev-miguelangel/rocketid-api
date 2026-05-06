import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UsersService } from './users.service';
import { User, UserRole, UserStatus } from './entities/user.entity';

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

describe('UsersService', () => {
  let service: UsersService;
  let repo: jest.Mocked<Repository<User>>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        {
          provide: getRepositoryToken(User),
          useValue: {
            findOneBy: jest.fn(),
            create: jest.fn(),
            save: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);
    repo = module.get(getRepositoryToken(User));
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('findById', () => {
    it('should return user when found', async () => {
      repo.findOneBy.mockResolvedValue(mockUser);
      const result = await service.findById('uuid-1');
      expect(result).toEqual(mockUser);
      expect(repo.findOneBy).toHaveBeenCalledWith({ id: 'uuid-1' });
    });

    it('should return null when not found', async () => {
      repo.findOneBy.mockResolvedValue(null);
      const result = await service.findById('non-existent');
      expect(result).toBeNull();
    });
  });

  describe('findByEmail', () => {
    it('should return user when found', async () => {
      repo.findOneBy.mockResolvedValue(mockUser);
      const result = await service.findByEmail('test@test.com');
      expect(result).toEqual(mockUser);
      expect(repo.findOneBy).toHaveBeenCalledWith({ email: 'test@test.com' });
    });
  });

  describe('findOrCreate', () => {
    it('should return existing user if found', async () => {
      repo.findOneBy.mockResolvedValue(mockUser);
      const result = await service.findOrCreate({ googleId: 'google-123', email: 'test@test.com', name: 'Test User' });
      expect(result).toEqual(mockUser);
      expect(repo.create).not.toHaveBeenCalled();
    });

    it('should create and return new user if not found', async () => {
      repo.findOneBy.mockResolvedValue(null);
      repo.create.mockReturnValue(mockUser);
      repo.save.mockResolvedValue(mockUser);

      const input = { googleId: 'google-123', email: 'test@test.com', name: 'Test User' };
      const result = await service.findOrCreate(input);
      expect(result).toEqual(mockUser);
      expect(repo.create).toHaveBeenCalledWith(input);
      expect(repo.save).toHaveBeenCalledWith(mockUser);
    });
  });
});
