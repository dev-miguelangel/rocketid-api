import { Injectable, UnauthorizedException, ForbiddenException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { User } from '../users/entities/user.entity';
import { UsersService } from '../users/users.service';
import { JwtPayload } from './strategies/jwt.strategy';

@Injectable()
export class AuthService {
  constructor(
    @InjectPinoLogger(AuthService.name)
    private readonly logger: PinoLogger,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly usersService: UsersService,
  ) {}

  generateToken(user: User): string {
    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
    };
    return this.jwtService.sign(payload);
  }

  // ── Dev Auth ─────────────────────────────────────────

  async devLogin(email: string, password: string): Promise<string> {
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
    return this.generateToken(user);
  }
}
