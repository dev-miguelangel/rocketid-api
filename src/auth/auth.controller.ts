import {
  Controller,
  Get,
  Post,
  Body,
  Req,
  Res,
  UseGuards,
  HttpCode,
  NotFoundException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiBody,
  ApiResponse,
  ApiExcludeEndpoint,
} from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import type { Request, Response } from 'express';
import { AuthService } from './auth.service';
import { GoogleAuthGuard } from './guards/google-auth.guard';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { User } from '../users/entities/user.entity';
import { Profile } from '../profiles/entities/profile.entity';
import { UsersService } from '../users/users.service';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { GoogleTokenDto } from './dto/google-token.dto';

interface JwtUser {
  id: string;
  email: string;
  name: string;
}

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly configService: ConfigService,
    private readonly usersService: UsersService,
  ) {}

  // ── Google OAuth ──────────────────────────────────────

  @Get('google')
  @UseGuards(GoogleAuthGuard)
  @ApiOperation({
    summary: 'Iniciar login con Google',
    description: 'Redirige al flujo OAuth2 de Google.',
  })
  @ApiResponse({ status: 302, description: 'Redirección a Google.' })
  googleLogin() {
    // Passport redirects automatically to Google
  }

  @Get('google/callback')
  @UseGuards(GoogleAuthGuard)
  @ApiExcludeEndpoint()
  async googleCallback(@Req() req: Request, @Res() res: Response) {
    const user = req.user as User;
    const { accessToken, refreshToken } =
      await this.authService.generateTokens(user);

    const allowedOrigins = (
      this.configService.get<string>('FRONTEND_URL') ?? 'http://localhost:4200'
    )
      .split(',')
      .map((u) => u.trim());
    const state = req.query.state as string;
    const frontendUrl = allowedOrigins.includes(state)
      ? state
      : allowedOrigins[0];

    res.redirect(
      `${frontendUrl}/auth/callback?accessToken=${accessToken}&refreshToken=${refreshToken}`,
    );
  }

  // ── Google Native Token ───────────────────────────────

  @Post('google/token')
  @HttpCode(200)
  @ApiOperation({
    summary: 'Login con Google SDK nativo',
    description:
      'Verifica el idToken emitido por el SDK de Google y devuelve tokens de sesión.',
  })
  @ApiBody({ type: GoogleTokenDto })
  @ApiResponse({
    status: 200,
    description: 'Access token y refresh token generados.',
  })
  @ApiResponse({ status: 400, description: 'Falta idToken.' })
  @ApiResponse({ status: 401, description: 'idToken inválido o expirado.' })
  async googleToken(@Body() dto: GoogleTokenDto) {
    return this.authService.loginWithGoogleToken(dto.idToken);
  }

  // ── JWT ───────────────────────────────────────────────

  @Get('me')
  @UseGuards(JwtAuthGuard)
  @HttpCode(200)
  @ApiBearerAuth('jwt')
  @ApiOperation({ summary: 'Perfil del usuario autenticado' })
  @ApiResponse({ status: 200, description: 'Datos del usuario.' })
  @ApiResponse({ status: 401, description: 'Token inválido o expirado.' })
  @ApiResponse({ status: 404, description: 'Usuario no encontrado.' })
async getMe(@Req() req: Request) {
    const { id } = req.user as JwtUser;
    const user = await this.usersService.findByIdWithProfile(id);
    if (!user) throw new NotFoundException('Usuario no encontrado');
    const { googleId, refreshTokenHash, profile, ...userData } = user as User & { profile?: Profile };
    if (profile) {
      const { contacts, addedBy, ...profileData } = profile;
      return { ...userData, profile: profileData };
    }
    return userData;
  }

  @Post('refresh')
  @HttpCode(200)
  @ApiOperation({ summary: 'Renovar tokens usando el refresh token' })
  @ApiBody({ type: RefreshTokenDto })
  @ApiResponse({
    status: 200,
    description: 'Nuevos access token y refresh token.',
  })
  @ApiResponse({
    status: 401,
    description: 'Refresh token inválido o expirado.',
  })
  async refresh(@Body() dto: RefreshTokenDto) {
    const { sub } = this.authService.verifyRefreshToken(dto.refreshToken);
    return this.authService.refreshTokens(sub, dto.refreshToken);
  }

  @Get('logout')
  @UseGuards(JwtAuthGuard)
  @HttpCode(200)
  @ApiBearerAuth('jwt')
  @ApiOperation({ summary: 'Cerrar sesión e invalidar refresh token' })
  @ApiResponse({ status: 200, description: 'Sesión cerrada.' })
  @ApiResponse({ status: 401, description: 'Token inválido o expirado.' })
  async logout(@Req() req: Request) {
    const { id } = req.user as JwtUser;
    await this.authService.logout(id);
    return { message: 'Sesión cerrada' };
  }
}
