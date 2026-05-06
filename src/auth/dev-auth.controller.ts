import { Controller, Get, Post, Body, HttpCode } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBody, ApiResponse } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import { AuthService } from './auth.service';
import { DevLoginDto } from './dto/dev-login.dto';

@ApiTags('auth')
@Controller('auth')
export class DevAuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly configService: ConfigService,
  ) {}

  @Get('dev-credentials')
  @HttpCode(200)
  @ApiOperation({ summary: '[DEV] Credenciales de desarrollo' })
  @ApiResponse({ status: 200, description: 'Email y contraseña del usuario dev.' })
  devCredentials() {
    return {
      email: this.configService.get('DEV_AUTH_EMAIL', ''),
      password: this.configService.get('DEV_AUTH_PASSWORD', ''),
    };
  }

  @Post('dev-login')
  @HttpCode(200)
  @ApiOperation({ summary: '[DEV] Login sin Google OAuth' })
  @ApiBody({ type: DevLoginDto })
  @ApiResponse({ status: 200, description: 'JWT generado.' })
  @ApiResponse({ status: 401, description: 'Credenciales incorrectas.' })
  @ApiResponse({ status: 403, description: 'No disponible en producción.' })
  async devLogin(@Body() dto: DevLoginDto) {
    const token = await this.authService.devLogin(dto.email, dto.password);
    return { token };
  }
}
