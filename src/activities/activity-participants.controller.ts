import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  Request,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ActivityParticipantsService } from './activity-participants.service';
import { ManageRegistrationDto } from './dto/manage-registration.dto';
import { InviteParticipantsDto } from './dto/invite-participants.dto';
import { AssignSubteamDto } from './dto/assign-subteam.dto';
import { ParticipantStatus } from './enums/participant-status.enum';

interface RequestUser {
  id: string;
}

interface AuthenticatedRequest extends Request {
  user: RequestUser;
}

@Controller('activities/:id')
@UseGuards(JwtAuthGuard)
export class ActivityParticipantsController {
  constructor(
    private readonly participantsService: ActivityParticipantsService,
  ) {}

  @Get('participants')
  listParticipants(
    @Param('id') id: string,
    @Request() req: AuthenticatedRequest,
    @Query('status') status?: ParticipantStatus,
  ) {
    return this.participantsService.listParticipants(id, req.user.id, status);
  }

  @Post('register')
  register(@Param('id') id: string, @Request() req: AuthenticatedRequest) {
    return this.participantsService.register(id, req.user.id);
  }

  @Post('withdraw')
  withdraw(@Param('id') id: string, @Request() req: AuthenticatedRequest) {
    return this.participantsService.withdraw(id, req.user.id);
  }

  @Post('registrations/:userId')
  manageRegistration(
    @Param('id') id: string,
    @Param('userId') userId: string,
    @Body() dto: ManageRegistrationDto,
    @Request() req: AuthenticatedRequest,
  ) {
    return this.participantsService.manageRegistration(
      id,
      req.user.id,
      userId,
      dto.action,
    );
  }

  @Post('invitations')
  inviteParticipants(
    @Param('id') id: string,
    @Body() dto: InviteParticipantsDto,
    @Request() req: AuthenticatedRequest,
  ) {
    return this.participantsService.inviteParticipants(
      id,
      req.user.id,
      dto.userIds,
    );
  }

  @Post('invitation/accept')
  acceptInvitation(
    @Param('id') id: string,
    @Request() req: AuthenticatedRequest,
  ) {
    return this.participantsService.respondToInvitation(id, req.user.id, true);
  }

  @Post('invitation/decline')
  declineInvitation(
    @Param('id') id: string,
    @Request() req: AuthenticatedRequest,
  ) {
    return this.participantsService.respondToInvitation(id, req.user.id, false);
  }

  @Post('attendance/confirm')
  confirmAttendance(
    @Param('id') id: string,
    @Request() req: AuthenticatedRequest,
  ) {
    return this.participantsService.confirmAttendance(id, req.user.id, true);
  }

  @Post('attendance/decline')
  declineAttendance(
    @Param('id') id: string,
    @Request() req: AuthenticatedRequest,
  ) {
    return this.participantsService.confirmAttendance(id, req.user.id, false);
  }

  @Post('subteams/assign')
  assignSubteam(
    @Param('id') id: string,
    @Body() dto: AssignSubteamDto,
    @Request() req: AuthenticatedRequest,
  ) {
    return this.participantsService.assignSubteam(
      id,
      req.user.id,
      dto.userId,
      dto.subteam,
      dto.participantRole,
    );
  }
}
