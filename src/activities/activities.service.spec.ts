import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { ActivitiesService } from './activities.service';
import { Activity } from './entities/activity.entity';
import { ActivityParticipant } from './entities/activity-participant.entity';
import { SportsService } from '../sports/sports.service';
import { TeamsService } from '../teams/teams.service';
import { TeamRole } from '../teams/enums/team-role.enum';
import { MemberStatus } from '../teams/entities/team-member.entity';
import { ActivityType } from './enums/activity-type.enum';
import { ActivityStatus } from './enums/activity-status.enum';
import { TrainingMode } from './enums/training-mode.enum';
import { OpenCallMode } from './enums/open-call-mode.enum';
import { CreateActivityDto } from './dto/create-activity.dto';

const HOUR = 60 * 60 * 1000;
const futureIso = (offsetMs: number): string =>
  new Date(Date.now() + offsetMs).toISOString();

describe('ActivitiesService', () => {
  let service: ActivitiesService;
  let activityRepository: {
    create: jest.Mock;
    save: jest.Mock;
    findOne: jest.Mock;
    remove: jest.Mock;
    createQueryBuilder: jest.Mock;
  };
  let participantRepository: {
    create: jest.Mock;
    save: jest.Mock;
    find: jest.Mock;
  };
  let sportsService: { findOne: jest.Mock };
  let teamsService: {
    findById: jest.Mock;
    getUserRole: jest.Mock;
    getMembers: jest.Mock;
  };

  const openCallDto = (): CreateActivityDto => ({
    type: ActivityType.OPEN_CALL,
    title: 'Caminata matutina',
    sportId: 1,
    startsAt: futureIso(48 * HOUR),
    endsAt: futureIso(50 * HOUR),
    requiresRegistration: false,
    latitude: -33.45,
    longitude: -70.66,
    openCallMode: OpenCallMode.OPEN,
    maxParticipants: 10,
  });

  beforeEach(async () => {
    activityRepository = {
      create: jest.fn((value: Partial<Activity>) => value),
      save: jest.fn((value: Partial<Activity>) =>
        Promise.resolve({ id: 'activity-1', ...value }),
      ),
      findOne: jest.fn(),
      remove: jest.fn().mockResolvedValue(undefined),
      createQueryBuilder: jest.fn(),
    };
    participantRepository = {
      create: jest.fn((value: Partial<ActivityParticipant>) => value),
      save: jest.fn().mockResolvedValue([]),
      find: jest.fn().mockResolvedValue([]),
    };
    sportsService = { findOne: jest.fn().mockResolvedValue({ id: 1 }) };
    teamsService = {
      findById: jest.fn().mockResolvedValue({ id: 'team-1' }),
      getUserRole: jest.fn(),
      getMembers: jest.fn().mockResolvedValue([]),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ActivitiesService,
        { provide: getRepositoryToken(Activity), useValue: activityRepository },
        {
          provide: getRepositoryToken(ActivityParticipant),
          useValue: participantRepository,
        },
        { provide: SportsService, useValue: sportsService },
        { provide: TeamsService, useValue: teamsService },
      ],
    }).compile();

    service = module.get<ActivitiesService>(ActivitiesService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('creates an open-call activity', async () => {
      activityRepository.findOne.mockResolvedValue({
        id: 'activity-1',
        type: ActivityType.OPEN_CALL,
      });

      const result = await service.create('user-1', openCallDto());

      expect(result).toEqual({
        id: 'activity-1',
        type: ActivityType.OPEN_CALL,
      });
      expect(sportsService.findOne).toHaveBeenCalledWith(1);
    });

    it('rejects when end is not after start', async () => {
      const dto = openCallDto();
      dto.endsAt = dto.startsAt;

      await expect(service.create('user-1', dto)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('rejects when start is in the past', async () => {
      const dto = openCallDto();
      dto.startsAt = futureIso(-HOUR);
      dto.endsAt = futureIso(HOUR);

      await expect(service.create('user-1', dto)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('rejects when the registration deadline is under 1 hour before start', async () => {
      const dto = openCallDto();
      dto.requiresRegistration = true;
      dto.registrationDeadline = futureIso(48 * HOUR - 30 * 60 * 1000);

      await expect(service.create('user-1', dto)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('rejects a challenge between the same team', async () => {
      const dto: CreateActivityDto = {
        ...openCallDto(),
        type: ActivityType.CHALLENGE,
        openCallMode: undefined,
        maxParticipants: undefined,
        teamOneId: 'team-1',
        teamTwoId: 'team-1',
      };

      await expect(service.create('user-1', dto)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('rejects training creation when the user is not owner or captain', async () => {
      teamsService.getUserRole.mockResolvedValue(TeamRole.MEMBER);
      const dto: CreateActivityDto = {
        ...openCallDto(),
        type: ActivityType.TRAINING,
        openCallMode: undefined,
        maxParticipants: undefined,
        teamId: 'team-1',
        trainingMode: TrainingMode.CLASSIC,
      };

      await expect(service.create('user-1', dto)).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('seeds pending participants for the team on a classic training', async () => {
      teamsService.getUserRole.mockResolvedValue(TeamRole.CAPTAIN);
      teamsService.getMembers.mockResolvedValue([
        { userId: 'member-1', status: MemberStatus.ACTIVE },
        { userId: 'member-2', status: MemberStatus.PENDING },
      ]);
      activityRepository.findOne.mockResolvedValue({ id: 'activity-1' });

      const dto: CreateActivityDto = {
        ...openCallDto(),
        type: ActivityType.TRAINING,
        openCallMode: undefined,
        maxParticipants: undefined,
        teamId: 'team-1',
        trainingMode: TrainingMode.CLASSIC,
      };

      await service.create('user-1', dto);

      expect(participantRepository.save).toHaveBeenCalledWith([
        expect.objectContaining({ userId: 'member-1' }),
      ]);
    });
  });

  describe('findById', () => {
    it('throws when the activity does not exist', async () => {
      activityRepository.findOne.mockResolvedValue(null);

      await expect(service.findById('missing')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('remove', () => {
    it('rejects when the requester is not the organizer', async () => {
      activityRepository.findOne.mockResolvedValue({
        id: 'activity-1',
        organizerId: 'other-user',
        type: ActivityType.OPEN_CALL,
      });

      await expect(service.remove('activity-1', 'user-1')).rejects.toThrow(
        ForbiddenException,
      );
    });
  });

  describe('cancel', () => {
    it('sets the activity status to cancelled for the organizer', async () => {
      activityRepository.findOne.mockResolvedValue({
        id: 'activity-1',
        organizerId: 'user-1',
        type: ActivityType.OPEN_CALL,
        status: ActivityStatus.SCHEDULED,
      });

      await service.cancel('activity-1', 'user-1');

      expect(activityRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({ status: ActivityStatus.CANCELLED }),
      );
    });
  });
});
