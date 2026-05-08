import { createHash } from 'crypto';
import { Injectable, UnauthorizedException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { OAuth2Client } from 'google-auth-library';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { User } from '../users/entities/user.entity';
import { Profile } from '../profiles/entities/profile.entity';
import { UsersService } from '../users/users.service';
import { JwtPayload } from './strategies/jwt.strategy';

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface AuthResponse extends AuthTokens {
  user: Omit<User, 'googleId' | 'refreshTokenHash'>;
}

@Injectable()
export class AuthService {
  constructor(
    @InjectPinoLogger(AuthService.name)
    private readonly logger: PinoLogger,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly usersService: UsersService,
  ) {}

  private buildPayload(user: User): JwtPayload {
    return { sub: user.id, email: user.email, name: user.name, role: user.role };
  }

  private hashToken(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }

  private refreshSecret(): string {
    return this.configService.get(
      'JWT_REFRESH_SECRET',
      this.configService.getOrThrow<string>('JWT_SECRET'),
    );
  }

  private refreshExpiresIn(): string {
    return this.configService.get('JWT_REFRESH_EXPIRES_IN', '30d');
  }

  async generateTokens(user: User): Promise<AuthTokens> {
    const payload = this.buildPayload(user);
    const accessToken = this.jwtService.sign(payload);
    const refreshToken = this.jwtService.sign(
      { sub: user.id },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      { secret: this.refreshSecret(), expiresIn: this.refreshExpiresIn() as any },
    );

    await this.usersService.updateRefreshToken(user.id, this.hashToken(refreshToken));
    return { accessToken, refreshToken };
  }

  verifyRefreshToken(token: string): { sub: string } {
    try {
      return this.jwtService.verify(token, { secret: this.refreshSecret() }) as { sub: string };
    } catch {
      throw new UnauthorizedException('Refresh token inválido o expirado');
    }
  }

  async refreshTokens(userId: string, refreshToken: string): Promise<AuthTokens> {
    const user = await this.usersService.findById(userId);
    if (!user || !user.refreshTokenHash) {
      throw new UnauthorizedException('Sesión inválida');
    }

    if (this.hashToken(refreshToken) !== user.refreshTokenHash) {
      throw new UnauthorizedException('Refresh token inválido');
    }

    const tokens = await this.generateTokens(user);
    this.logger.info({ userId: user.id }, 'Tokens renovados');
    return tokens;
  }

  async logout(userId: string): Promise<void> {
    await this.usersService.updateRefreshToken(userId, null);
    this.logger.info({ userId }, 'Sesión cerrada');
  }

  // ── Google Native Token ───────────────────────────────

  async loginWithGoogleToken(idToken: string): Promise<AuthResponse> {
    const clientId = this.configService.getOrThrow<string>('GOOGLE_CLIENT_ID');
    const client = new OAuth2Client(clientId);

    let payload: import('google-auth-library').TokenPayload;
    try {
      const ticket = await client.verifyIdToken({ idToken, audience: clientId });
      const p = ticket.getPayload();
      if (!p) throw new Error('empty payload');
      payload = p;
    } catch {
      throw new UnauthorizedException('idToken inválido o expirado');
    }

    if (!payload.email || !payload.email_verified) {
      throw new UnauthorizedException('La cuenta de Google no tiene el email verificado');
    }

    const user = await this.usersService.findOrCreate({
      googleId: payload.sub,
      email: payload.email,
      name: payload.name ?? payload.email,
      avatar: payload.picture,
    });

    this.logger.info({ userId: user.id }, 'Login nativo con Google exitoso');

    const tokens = await this.generateTokens(user);
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { googleId: _googleId, refreshTokenHash: _hash, ...publicUser } = user;
    return { ...tokens, user: publicUser };
  }

  // ── Dev Auth ─────────────────────────────────────────

  async devLogin(email: string, password: string): Promise<AuthTokens> {
    if (this.configService.get('NODE_ENV') === 'production') {
      throw new ForbiddenException('No disponible en producción');
    }

    if (this.configService.get('DEV_AUTH_ENABLED') !== 'true') {
      throw new ForbiddenException('DEV_AUTH_ENABLED no está activo');
    }

    const devEmail = this.configService.getOrThrow<string>('DEV_AUTH_EMAIL');
    const devPassword = this.configService.getOrThrow<string>('DEV_AUTH_PASSWORD');

    if (email !== devEmail || password !== devPassword) {
      this.logger.warn({ email }, 'Intento de dev-login con credenciales incorrectas');
      throw new UnauthorizedException('Credenciales incorrectas');
    }

    const user = await this.usersService.findOrCreate({
      googleId: 'dev-local-user',
      email: devEmail,
      name: this.configService.get('DEV_AUTH_NAME', 'Dev User'),
    });

    this.logger.info({ userId: user.id }, 'Dev login exitoso');
    return this.generateTokens(user);
  }
}
