import {
  Controller,
  Patch,
  Body,
  Req,
  HttpCode,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiBody } from '@nestjs/swagger';
import type { Request } from 'express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { UsersService } from './users.service';
import { UpdateOnboardingDto } from './dto/update-onboarding.dto';

interface JwtUser {
  id: string;
  email: string;
  name: string;
}

@ApiTags('users')
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Patch('onboarding')
  @UseGuards(JwtAuthGuard)
  @HttpCode(200)
  @ApiBearerAuth('jwt')
  @ApiOperation({ summary: 'Actualizar datos de onboarding del usuario' })
  @ApiBody({ type: UpdateOnboardingDto })
  async updateOnboarding(
    @Req() req: Request,
    @Body() dto: UpdateOnboardingDto,
  ) {
    const { id } = req.user as JwtUser;
    return this.usersService.updateOnboarding(id, dto);
  }
}
