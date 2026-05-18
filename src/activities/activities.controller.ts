import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Request,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ActivitiesService } from './activities.service';
import { CreateActivityDto } from './dto/create-activity.dto';
import { UpdateActivityDto } from './dto/update-activity.dto';
import { ListActivitiesQueryDto } from './dto/list-activities-query.dto';

interface RequestUser {
  id: string;
}

interface AuthenticatedRequest extends Request {
  user: RequestUser;
}

@Controller('activities')
@UseGuards(JwtAuthGuard)
export class ActivitiesController {
  constructor(private readonly activitiesService: ActivitiesService) {}

  @Post()
  create(@Body() dto: CreateActivityDto, @Request() req: AuthenticatedRequest) {
    return this.activitiesService.create(req.user.id, dto);
  }

  @Get()
  findAll(@Query() query: ListActivitiesQueryDto) {
    return this.activitiesService.findAll(query);
  }

  @Get('mine')
  findMine(@Request() req: AuthenticatedRequest) {
    return this.activitiesService.findMine(req.user.id);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.activitiesService.findById(id);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() dto: UpdateActivityDto,
    @Request() req: AuthenticatedRequest,
  ) {
    return this.activitiesService.update(id, req.user.id, dto);
  }

  @Post(':id/cancel')
  cancel(@Param('id') id: string, @Request() req: AuthenticatedRequest) {
    return this.activitiesService.cancel(id, req.user.id);
  }

  @Delete(':id')
  remove(@Param('id') id: string, @Request() req: AuthenticatedRequest) {
    return this.activitiesService.remove(id, req.user.id);
  }
}
