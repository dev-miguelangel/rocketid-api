import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from './auth.service';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { UsersService } from '../users/users.service';
import { ForbiddenException, UnauthorizedException } from '@nestjs/common';
import { getLoggerToken } from 'nestjs-pino';

describe('AuthService', () => {
  let service: AuthService;
  let usersService: Partial<UsersService>;
  let configService: Partial<ConfigService>;
  let jwtService: Partial<JwtService>;

  beforeEach(async () => {
    usersService = {
      findOrCreate: jest.fn(),
      findById: jest.fn(),
      updateRefreshToken: jest.fn().mockResolvedValue(undefined),
    };
    configService = {
      get: jest.fn((key: string, fallback?: unknown) => {
        const config: Record<string, unknown> = {
          NODE_ENV: 'development',
          DEV_AUTH_ENABLED: 'true',
          DEV_AUTH_EMAIL: 'dev@sportcard.dev',
          DEV_AUTH_PASSWORD: 'dev1234',
          DEV_AUTH_NAME: 'Dev User',
        };
        return config[key] ?? fallback;
      }),
      getOrThrow: jest.fn((key: string) => {
        const config: Record<string, string> = {
          DEV_AUTH_EMAIL: 'dev@sportcard.dev',
          DEV_AUTH_PASSWORD: 'dev1234',
          JWT_SECRET: 'test-secret',
        };
        return config[key];
      }),
    };
    jwtService = {
      sign: jest.fn().mockReturnValue('mock-token'),
      verify: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: ConfigService, useValue: configService },
        { provide: JwtService, useValue: jwtService },
        { provide: UsersService, useValue: usersService },
        { provide: getLoggerToken(AuthService.name), useValue: { warn: jest.fn(), info: jest.fn() } },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('generateTokens', () => {
    it('should return accessToken and refreshToken', async () => {
      const mockUser = { id: 'user-123', email: 'test@test.com', name: 'Test User', role: 'user' } as any;
      const tokens = await service.generateTokens(mockUser);
      expect(tokens).toHaveProperty('accessToken', 'mock-token');
      expect(tokens).toHaveProperty('refreshToken', 'mock-token');
      expect(jwtService.sign).toHaveBeenCalledTimes(2);
      expect(usersService.updateRefreshToken).toHaveBeenCalledWith('user-123', expect.any(String));
    });
  });

  describe('verifyRefreshToken', () => {
    it('should return payload when token is valid', () => {
      (jwtService.verify as jest.Mock).mockReturnValue({ sub: 'user-123' });
      const result = service.verifyRefreshToken('valid-token');
      expect(result).toEqual({ sub: 'user-123' });
    });

    it('should throw UnauthorizedException when token is invalid', () => {
      (jwtService.verify as jest.Mock).mockImplementation(() => { throw new Error('invalid'); });
      expect(() => service.verifyRefreshToken('bad-token')).toThrow(UnauthorizedException);
    });
  });

  describe('refreshTokens', () => {
    it('should throw UnauthorizedException when user has no stored hash', async () => {
      (usersService.findById as jest.Mock).mockResolvedValue({ id: 'user-123', refreshTokenHash: null });
      await expect(service.refreshTokens('user-123', 'any-token')).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException when hash does not match', async () => {
      (usersService.findById as jest.Mock).mockResolvedValue({
        id: 'user-123',
        refreshTokenHash: 'wrong-hash',
      });
      await expect(service.refreshTokens('user-123', 'bad-token')).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('logout', () => {
    it('should clear refresh token hash', async () => {
      await service.logout('user-123');
      expect(usersService.updateRefreshToken).toHaveBeenCalledWith('user-123', null);
    });
  });

  describe('devLogin', () => {
    it('should throw ForbiddenException in production', async () => {
      (configService.get as jest.Mock).mockReturnValueOnce('production');
      await expect(service.devLogin('dev@test.com', 'password')).rejects.toThrow(ForbiddenException);
    });

    it('should throw ForbiddenException when DEV_AUTH_ENABLED is not true', async () => {
      (configService.get as jest.Mock)
        .mockReturnValueOnce('development')
        .mockReturnValueOnce(undefined);
      await expect(service.devLogin('dev@test.com', 'password')).rejects.toThrow(ForbiddenException);
    });

    it('should throw UnauthorizedException with invalid credentials', async () => {
      (configService.get as jest.Mock)
        .mockReturnValueOnce('development')
        .mockReturnValueOnce('true');
      (configService.getOrThrow as jest.Mock)
        .mockReturnValueOnce('dev@sportcard.dev')
        .mockReturnValueOnce('dev1234');
      await expect(service.devLogin('wrong@test.com', 'wrong')).rejects.toThrow(UnauthorizedException);
    });

    it('should return tokens with valid dev credentials', async () => {
      (configService.get as jest.Mock)
        .mockReturnValueOnce('development')
        .mockReturnValueOnce('true')
        .mockReturnValueOnce('Dev User');
      (configService.getOrThrow as jest.Mock)
        .mockReturnValueOnce('dev@sportcard.dev')
        .mockReturnValueOnce('dev1234');

      (usersService.findOrCreate as jest.Mock).mockResolvedValue({
        id: 'user-123',
        email: 'dev@sportcard.dev',
        name: 'Dev User',
        role: 'user',
      });

      const tokens = await service.devLogin('dev@sportcard.dev', 'dev1234');
      expect(tokens).toHaveProperty('accessToken');
      expect(tokens).toHaveProperty('refreshToken');
      expect(usersService.findOrCreate).toHaveBeenCalledWith({
        googleId: 'dev-local-user',
        email: 'dev@sportcard.dev',
        name: 'Dev User',
      });
    });
  });
});
