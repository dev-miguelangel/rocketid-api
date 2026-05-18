import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { PendingActionsService } from './pending-actions.service';
import { ActivityParticipant } from '../activities/entities/activity-participant.entity';
import { Activity } from '../activities/entities/activity.entity';
import { ParticipantStatus } from '../activities/enums/participant-status.enum';
import { ActivityType } from '../activities/enums/activity-type.enum';
import { TeamMember, MemberStatus } from '../teams/entities/team-member.entity';

type WhereArg = { where: Record<string, unknown> };

describe('PendingActionsService', () => {
  let service: PendingActionsService;
  let participantRepository: { find: jest.Mock };
  let teamMemberRepository: { find: jest.Mock };
  let activityRepository: { find: jest.Mock };

  const invitation = { id: 'inv-1' } as ActivityParticipant;
  const trainingRow = {
    id: 'tp-1',
    activity: { type: ActivityType.TRAINING },
  } as ActivityParticipant;
  const publicPendingRow = {
    id: 'tp-2',
    activity: { type: ActivityType.OPEN_CALL },
  } as ActivityParticipant;
  const registrationRequest = { id: 'rr-1' } as ActivityParticipant;
  const joinRequest = { id: 'jr-1' } as TeamMember;

  beforeEach(async () => {
    participantRepository = {
      find: jest.fn((opts: WhereArg) => {
        if (opts.where.status === ParticipantStatus.INVITED) {
          return Promise.resolve([invitation]);
        }
        if (opts.where.activityId !== undefined) {
          return Promise.resolve([registrationRequest]);
        }
        return Promise.resolve([trainingRow, publicPendingRow]);
      }),
    };
    teamMemberRepository = {
      find: jest.fn((opts: WhereArg) => {
        if (opts.where.status === MemberStatus.ACTIVE) {
          return Promise.resolve([{ teamId: 'team-1' }]);
        }
        return Promise.resolve([joinRequest]);
      }),
    };
    activityRepository = {
      find: jest.fn().mockResolvedValue([{ id: 'act-1' }]),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PendingActionsService,
        {
          provide: getRepositoryToken(ActivityParticipant),
          useValue: participantRepository,
        },
        {
          provide: getRepositoryToken(TeamMember),
          useValue: teamMemberRepository,
        },
        { provide: getRepositoryToken(Activity), useValue: activityRepository },
      ],
    }).compile();

    service = module.get<PendingActionsService>(PendingActionsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('aggregates the four categories with counts and total', async () => {
    const result = await service.getPendingActions('user-1');

    expect(result.activityInvitations).toEqual([invitation]);
    expect(result.teamJoinRequests).toEqual([joinRequest]);
    expect(result.activityRegistrationRequests).toEqual([registrationRequest]);
    expect(result.counts).toEqual({
      activityInvitations: 1,
      trainingConvocations: 1,
      teamJoinRequests: 1,
      activityRegistrationRequests: 1,
    });
    expect(result.total).toBe(4);
  });

  it('keeps only training rows among the pending convocations', async () => {
    const result = await service.getPendingActions('user-1');

    expect(result.trainingConvocations).toEqual([trainingRow]);
    expect(result.trainingConvocations).not.toContain(publicPendingRow);
  });

  it('returns no team join requests when the user manages no teams', async () => {
    teamMemberRepository.find.mockImplementation((opts: WhereArg) => {
      if (opts.where.status === MemberStatus.ACTIVE) {
        return Promise.resolve([]);
      }
      return Promise.resolve([joinRequest]);
    });

    const result = await service.getPendingActions('user-1');

    expect(result.teamJoinRequests).toEqual([]);
    expect(result.counts.teamJoinRequests).toBe(0);
  });

  it('returns no registration requests when the user has no public open calls', async () => {
    activityRepository.find.mockResolvedValue([]);

    const result = await service.getPendingActions('user-1');

    expect(result.activityRegistrationRequests).toEqual([]);
    expect(result.counts.activityRegistrationRequests).toBe(0);
  });
});
