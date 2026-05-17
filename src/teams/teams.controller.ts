import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Query,
  Patch,
  Post,
  Request,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { TeamsService } from './teams.service';
import { CreateTeamDto } from './dto/create-team.dto';
import { UpdateTeamDto } from './dto/update-team.dto';
import { ManageMemberDto, MemberAction } from './dto/manage-member.dto';
import { TeamRole } from './enums/team-role.enum';

interface RequestUser {
  id: string;
}

interface AuthenticatedRequest extends Request {
  user: RequestUser;
}

@Controller('teams')
@UseGuards(JwtAuthGuard)
export class TeamsController {
  constructor(private readonly teamsService: TeamsService) {}

  @Post()
  create(@Body() dto: CreateTeamDto, @Request() req: AuthenticatedRequest) {
    return this.teamsService.create(req.user.id, dto);
  }

  @Get()
  findAll(@Request() req: AuthenticatedRequest) {
    return this.teamsService.findAll(req.user.id);
  }

  @Get('search')
  search(@Query('q') q: string) {
    return this.teamsService.search(q);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.teamsService.findById(id);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() dto: UpdateTeamDto,
    @Request() req: AuthenticatedRequest,
  ) {
    return this.teamsService.update(id, req.user.id, dto);
  }

  @Delete(':id')
  remove(@Param('id') id: string, @Request() req: AuthenticatedRequest) {
    return this.teamsService.remove(id, req.user.id);
  }

  @Get(':id/members')
  getMembers(@Param('id') id: string) {
    return this.teamsService.getMembers(id);
  }

  @Post(':id/members')
  addMember(
    @Param('id') id: string,
    @Body() dto: ManageMemberDto,
    @Request() req: AuthenticatedRequest,
  ) {
    if (dto.action === MemberAction.ADD) {
      return this.teamsService.addMember(id, req.user.id, dto.userId, dto.role);
    }
    throw new Error('Invalid action for this endpoint');
  }

  @Delete(':id/members/:userId')
  removeMember(
    @Param('id') id: string,
    @Param('userId') userId: string,
    @Request() req: AuthenticatedRequest,
  ) {
    return this.teamsService.removeMember(id, req.user.id, userId);
  }

  @Patch(':id/members/:userId/role')
  updateMemberRole(
    @Param('id') id: string,
    @Param('userId') userId: string,
    @Body('role') role: TeamRole,
    @Request() req: AuthenticatedRequest,
  ) {
    return this.teamsService.updateMemberRole(id, req.user.id, userId, role);
  }

  @Post(':id/join')
  requestToJoin(@Param('id') id: string, @Request() req: AuthenticatedRequest) {
    return this.teamsService.requestToJoin(id, req.user.id);
  }

  @Post(':id/leave')
  leave(@Param('id') id: string, @Request() req: AuthenticatedRequest) {
    return this.teamsService.leave(id, req.user.id);
  }

  @Get(':id/requests')
  getPendingRequests(
    @Param('id') id: string,
    @Request() req: AuthenticatedRequest,
  ) {
    return this.teamsService.getPendingRequests(id, req.user.id);
  }

  @Post(':id/requests/:userId/accept')
  acceptRequest(
    @Param('id') id: string,
    @Param('userId') userId: string,
    @Request() req: AuthenticatedRequest,
  ) {
    return this.teamsService.acceptRequest(id, req.user.id, userId);
  }

  @Post(':id/requests/:userId/reject')
  rejectRequest(
    @Param('id') id: string,
    @Param('userId') userId: string,
    @Request() req: AuthenticatedRequest,
  ) {
    return this.teamsService.rejectRequest(id, req.user.id, userId);
  }
}
