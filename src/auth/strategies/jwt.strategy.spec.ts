import { Test, TestingModule } from '@nestjs/testing';
import { UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtStrategy, JwtPayload } from './jwt.strategy';
import { UsersService } from '../../users/users.service';
import { UserRole, UserStatus } from '../../users/entities/user.entity';

describe('JwtStrategy', () => {
  let strategy: JwtStrategy;
  let usersService: jest.Mocked<UsersService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        JwtStrategy,
        {
          provide: ConfigService,
          useValue: {
            getOrThrow: jest.fn().mockReturnValue('test-secret'),
          },
        },
        {
          provide: UsersService,
          useValue: { findById: jest.fn() },
        },
      ],
    }).compile();

    strategy = module.get<JwtStrategy>(JwtStrategy);
    usersService = module.get(UsersService);
  });

  it('should be defined', () => {
    expect(strategy).toBeDefined();
  });

  describe('validate', () => {
    const payload: JwtPayload = {
      sub: 'uuid-1',
      email: 'test@test.com',
      name: 'Test User',
      role: UserRole.USER,
    };

    it('should return user data for valid active user', async () => {
      usersService.findById.mockResolvedValue({
        id: 'uuid-1',
        status: UserStatus.ACTIVE,
        role: UserRole.USER,
      } as any);

      const result = await strategy.validate(payload);
      expect(result).toEqual({
        id: 'uuid-1',
        email: 'test@test.com',
        name: 'Test User',
        role: UserRole.USER,
      });
    });

    it('should throw UnauthorizedException when user not found', async () => {
      usersService.findById.mockResolvedValue(null);
      await expect(strategy.validate(payload)).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException when user is blocked', async () => {
      usersService.findById.mockResolvedValue({
        id: 'uuid-1',
        status: UserStatus.BLOCKED,
        role: UserRole.USER,
      } as any);
      await expect(strategy.validate(payload)).rejects.toThrow(UnauthorizedException);
    });
  });
});
