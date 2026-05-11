import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { GoogleStrategy } from './google.strategy';
import { UsersService } from '../../users/users.service';
import { UserRole, UserStatus } from '../../users/entities/user.entity';

const mockUser = {
  id: 'uuid-1',
  googleId: 'google-123',
  email: 'test@google.com',
  name: 'Test User',
  avatar: 'https://example.com/photo.jpg',
  role: UserRole.USER,
  status: UserStatus.ACTIVE,
  createdAt: new Date(),
  updatedAt: new Date(),
};

describe('GoogleStrategy', () => {
  let strategy: GoogleStrategy;
  let usersService: jest.Mocked<UsersService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GoogleStrategy,
        {
          provide: ConfigService,
          useValue: {
            getOrThrow: jest.fn((key: string) => {
              const config: Record<string, string> = {
                GOOGLE_CLIENT_ID: 'mock-client-id',
                GOOGLE_CLIENT_SECRET: 'mock-client-secret',
                GOOGLE_CALLBACK_URL:
                  'http://localhost:3000/auth/google/callback',
              };
              return config[key];
            }),
          },
        },
        {
          provide: UsersService,
          useValue: { findOrCreate: jest.fn() },
        },
      ],
    }).compile();

    strategy = module.get<GoogleStrategy>(GoogleStrategy);
    usersService = module.get(UsersService);
  });

  it('should be defined', () => {
    expect(strategy).toBeDefined();
  });

  describe('validate', () => {
    it('should call findOrCreate and invoke done with user', async () => {
      usersService.findOrCreate.mockResolvedValue(mockUser as any);

      const profile = {
        id: 'google-123',
        name: { givenName: 'Test', familyName: 'User' },
        emails: [{ value: 'test@google.com' }],
        photos: [{ value: 'https://example.com/photo.jpg' }],
      } as any;

      const done = jest.fn();
      await strategy.validate('access', 'refresh', profile, done);

      expect(usersService.findOrCreate).toHaveBeenCalledWith({
        googleId: 'google-123',
        email: 'test@google.com',
        name: 'Test User',
        avatar: 'https://example.com/photo.jpg',
      });
      expect(done).toHaveBeenCalledWith(null, mockUser);
    });
  });
});
