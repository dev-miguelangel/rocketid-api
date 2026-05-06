import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
  Request,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CreateProfileDto } from './dto/create-profile.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { ProfilesService, RequestUser } from './profiles.service';

interface AuthenticatedRequest extends Request {
  user: RequestUser;
}

@Controller('profiles')
export class ProfilesController {
  constructor(private readonly profilesService: ProfilesService) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  create(@Request() req: AuthenticatedRequest, @Body() dto: CreateProfileDto) {
    return this.profilesService.create(req.user.id, dto);
  }

  @Get()
  @UseGuards(JwtAuthGuard)
  findAll() {
    return this.profilesService.findAll();
  }

  // Static segments must come before :id to avoid route collision
  @Get('search')
  search(@Query('q') q: string) {
    return this.profilesService.search(q);
  }

  @Get('alias/:alias')
  findByAlias(@Param('alias') alias: string) {
    return this.profilesService.findByAlias(alias);
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  findOne(@Param('id') id: string) {
    return this.profilesService.findOne(id);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard)
  update(
    @Param('id') id: string,
    @Body() dto: UpdateProfileDto,
    @Request() req: AuthenticatedRequest,
  ) {
    return this.profilesService.update(id, dto, req.user);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id') id: string, @Request() req: AuthenticatedRequest) {
    return this.profilesService.remove(id, req.user);
  }
}
