import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { ActivityParticipant } from '../activities/entities/activity-participant.entity';
import { Activity } from '../activities/entities/activity.entity';
import { ParticipantStatus } from '../activities/enums/participant-status.enum';
import { ActivityType } from '../activities/enums/activity-type.enum';
import { OpenCallMode } from '../activities/enums/open-call-mode.enum';
import { TeamMember, MemberStatus } from '../teams/entities/team-member.entity';
import { TeamRole } from '../teams/enums/team-role.enum';

/**
 * The user's pending actions grouped by category, with per-category counts and
 * a grand total.
 */
export interface PendingActionsResponse {
  activityInvitations: ActivityParticipant[];
  trainingConvocations: ActivityParticipant[];
  teamJoinRequests: TeamMember[];
  activityRegistrationRequests: ActivityParticipant[];
  counts: {
    activityInvitations: number;
    trainingConvocations: number;
    teamJoinRequests: number;
    activityRegistrationRequests: number;
  };
  total: number;
}

@Injectable()
export class PendingActionsService {
  constructor(
    @InjectRepository(ActivityParticipant)
    private readonly participantRepository: Repository<ActivityParticipant>,
    @InjectRepository(TeamMember)
    private readonly teamMemberRepository: Repository<TeamMember>,
    @InjectRepository(Activity)
    private readonly activityRepository: Repository<Activity>,
  ) {}

  async getPendingActions(userId: string): Promise<PendingActionsResponse> {
    const [
      activityInvitations,
      trainingConvocations,
      teamJoinRequests,
      activityRegistrationRequests,
    ] = await Promise.all([
      this.findActivityInvitations(userId),
      this.findTrainingConvocations(userId),
      this.findTeamJoinRequests(userId),
      this.findActivityRegistrationRequests(userId),
    ]);

    const counts = {
      activityInvitations: activityInvitations.length,
      trainingConvocations: trainingConvocations.length,
      teamJoinRequests: teamJoinRequests.length,
      activityRegistrationRequests: activityRegistrationRequests.length,
    };

    return {
      activityInvitations,
      trainingConvocations,
      teamJoinRequests,
      activityRegistrationRequests,
      counts,
      total:
        counts.activityInvitations +
        counts.trainingConvocations +
        counts.teamJoinRequests +
        counts.activityRegistrationRequests,
    };
  }

  /** Activity invitations the user received and must accept or decline. */
  private findActivityInvitations(
    userId: string,
  ): Promise<ActivityParticipant[]> {
    return this.participantRepository.find({
      where: { userId, status: ParticipantStatus.INVITED },
      relations: ['activity', 'activity.sport', 'activity.organizer'],
      order: { createdAt: 'DESC' },
    });
  }

  /** Trainings the user was convoked to and must confirm attendance for. */
  private async findTrainingConvocations(
    userId: string,
  ): Promise<ActivityParticipant[]> {
    const pending = await this.participantRepository.find({
      where: { userId, status: ParticipantStatus.PENDING },
      relations: ['activity', 'activity.sport', 'activity.team'],
      order: { createdAt: 'DESC' },
    });
    // A pending row of the user's own public open call is waiting on the
    // organizer, not an action for the user — keep only trainings.
    return pending.filter((row) => row.activity.type === ActivityType.TRAINING);
  }

  /** Join requests to teams the user owns or captains. */
  private async findTeamJoinRequests(userId: string): Promise<TeamMember[]> {
    const managed = await this.teamMemberRepository.find({
      where: {
        userId,
        role: In([TeamRole.OWNER, TeamRole.CAPTAIN]),
        status: MemberStatus.ACTIVE,
      },
      select: ['teamId'],
    });
    const managedTeamIds = managed.map((member) => member.teamId);
    if (managedTeamIds.length === 0) {
      return [];
    }
    return this.teamMemberRepository.find({
      where: { teamId: In(managedTeamIds), status: MemberStatus.PENDING },
      relations: ['team', 'user', 'user.profile'],
      order: { createdAt: 'DESC' },
    });
  }

  /** Registrations awaiting the user's approval on their public open calls. */
  private async findActivityRegistrationRequests(
    userId: string,
  ): Promise<ActivityParticipant[]> {
    const myPublicCalls = await this.activityRepository.find({
      where: {
        organizerId: userId,
        type: ActivityType.OPEN_CALL,
        openCallMode: OpenCallMode.PUBLIC,
      },
      select: ['id'],
    });
    const activityIds = myPublicCalls.map((activity) => activity.id);
    if (activityIds.length === 0) {
      return [];
    }
    return this.participantRepository.find({
      where: {
        activityId: In(activityIds),
        status: ParticipantStatus.PENDING,
      },
      relations: ['activity', 'user', 'user.profile'],
      order: { createdAt: 'DESC' },
    });
  }
}
