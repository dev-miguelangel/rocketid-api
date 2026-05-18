import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { ActivityParticipantsService } from './activity-participants.service';
import { ActivityParticipant } from './entities/activity-participant.entity';
import { ActivitiesService } from './activities.service';
import { ProfilesService } from '../profiles/profiles.service';
import { ActivityType } from './enums/activity-type.enum';
import { ActivityStatus } from './enums/activity-status.enum';
import { OpenCallMode } from './enums/open-call-mode.enum';
import { TrainingMode } from './enums/training-mode.enum';
import { ParticipantStatus } from './enums/participant-status.enum';
import { Subteam } from './enums/subteam.enum';
import { ParticipantRole } from './enums/participant-role.enum';
import { RegistrationAction } from './dto/manage-registration.dto';

const FUTURE = new Date(Date.now() + 48 * 60 * 60 * 1000);

describe('ActivityParticipantsService', () => {
  let service: ActivityParticipantsService;
  let participantRepository: {
    create: jest.Mock;
    save: jest.Mock;
    findOne: jest.Mock;
    find: jest.Mock;
    count: jest.Mock;
  };
  let activitiesService: { findById: jest.Mock; checkCanManage: jest.Mock };
  let profilesService: { getContacts: jest.Mock };

  const openCall = (overrides: Record<string, unknown> = {}) => ({
    id: 'activity-1',
    type: ActivityType.OPEN_CALL,
    status: ActivityStatus.SCHEDULED,
    openCallMode: OpenCallMode.OPEN,
    startsAt: FUTURE,
    requiresRegistration: false,
    registrationDeadline: null,
    maxParticipants: 10,
    ...overrides,
  });

  beforeEach(async () => {
    participantRepository = {
      create: jest.fn((value: Partial<ActivityParticipant>) => value),
      save: jest.fn((value: unknown) => Promise.resolve(value)),
      findOne: jest.fn(),
      find: jest.fn().mockResolvedValue([]),
      count: jest.fn().mockResolvedValue(0),
    };
    activitiesService = {
      findById: jest.fn(),
      checkCanManage: jest.fn().mockResolvedValue(undefined),
    };
    profilesService = { getContacts: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ActivityParticipantsService,
        {
          provide: getRepositoryToken(ActivityParticipant),
          useValue: participantRepository,
        },
        { provide: ActivitiesService, useValue: activitiesService },
        { provide: ProfilesService, useValue: profilesService },
      ],
    }).compile();

    service = module.get<ActivityParticipantsService>(
      ActivityParticipantsService,
    );
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('register', () => {
    it('auto-confirms on an open convocatoria', async () => {
      activitiesService.findById.mockResolvedValue(openCall());
      participantRepository.findOne.mockResolvedValue(null);

      const result = await service.register('activity-1', 'user-1');

      expect(result).toEqual(
        expect.objectContaining({ status: ParticipantStatus.CONFIRMED }),
      );
    });

    it('leaves the registration pending on a public convocatoria', async () => {
      activitiesService.findById.mockResolvedValue(
        openCall({ openCallMode: OpenCallMode.PUBLIC }),
      );
      participantRepository.findOne.mockResolvedValue(null);

      const result = await service.register('activity-1', 'user-1');

      expect(result).toEqual(
        expect.objectContaining({ status: ParticipantStatus.PENDING }),
      );
    });

    it('rejects direct registration on a private convocatoria', async () => {
      activitiesService.findById.mockResolvedValue(
        openCall({ openCallMode: OpenCallMode.PRIVATE }),
      );

      await expect(service.register('activity-1', 'user-1')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('rejects a duplicate registration', async () => {
      activitiesService.findById.mockResolvedValue(openCall());
      participantRepository.findOne.mockResolvedValue({ id: 'p-1' });

      await expect(service.register('activity-1', 'user-1')).rejects.toThrow(
        ConflictException,
      );
    });

    it('rejects when there are no spots left', async () => {
      activitiesService.findById.mockResolvedValue(
        openCall({ maxParticipants: 2 }),
      );
      participantRepository.findOne.mockResolvedValue(null);
      participantRepository.count.mockResolvedValue(2);

      await expect(service.register('activity-1', 'user-1')).rejects.toThrow(
        ConflictException,
      );
    });

    it('rejects direct registration on a non open-call activity', async () => {
      activitiesService.findById.mockResolvedValue({
        type: ActivityType.TRAINING,
        status: ActivityStatus.SCHEDULED,
      });

      await expect(service.register('activity-1', 'user-1')).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('manageRegistration', () => {
    it('confirms a pending request on a public convocatoria', async () => {
      activitiesService.findById.mockResolvedValue(
        openCall({ openCallMode: OpenCallMode.PUBLIC }),
      );
      participantRepository.findOne.mockResolvedValue({
        id: 'p-1',
        status: ParticipantStatus.PENDING,
      });

      const result = await service.manageRegistration(
        'activity-1',
        'organizer-1',
        'user-1',
        RegistrationAction.CONFIRM,
      );

      expect(result).toEqual(
        expect.objectContaining({ status: ParticipantStatus.CONFIRMED }),
      );
    });

    it('throws when the request does not exist', async () => {
      activitiesService.findById.mockResolvedValue(
        openCall({ openCallMode: OpenCallMode.PUBLIC }),
      );
      participantRepository.findOne.mockResolvedValue(null);

      await expect(
        service.manageRegistration(
          'activity-1',
          'organizer-1',
          'user-1',
          RegistrationAction.REJECT,
        ),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('inviteParticipants', () => {
    it('rejects inviting users that are not contacts on a private convocatoria', async () => {
      activitiesService.findById.mockResolvedValue(
        openCall({ openCallMode: OpenCallMode.PRIVATE }),
      );
      profilesService.getContacts.mockResolvedValue([
        { user: { id: 'contact-1' } },
      ]);

      await expect(
        service.inviteParticipants('activity-1', 'organizer-1', ['stranger']),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('respondToInvitation', () => {
    it('confirms the participant when the invitation is accepted', async () => {
      participantRepository.findOne.mockResolvedValue({
        id: 'p-1',
        status: ParticipantStatus.INVITED,
      });
      activitiesService.findById.mockResolvedValue(openCall());

      const result = await service.respondToInvitation(
        'activity-1',
        'user-1',
        true,
      );

      expect(result.status).toBe(ParticipantStatus.CONFIRMED);
      expect(result.respondedAt).toBeInstanceOf(Date);
    });

    it('throws when there is no pending invitation', async () => {
      participantRepository.findOne.mockResolvedValue(null);

      await expect(
        service.respondToInvitation('activity-1', 'user-1', true),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('confirmAttendance', () => {
    it('confirms a convoked member of a training', async () => {
      activitiesService.findById.mockResolvedValue({
        type: ActivityType.TRAINING,
      });
      participantRepository.findOne.mockResolvedValue({
        id: 'p-1',
        status: ParticipantStatus.PENDING,
      });

      const result = await service.confirmAttendance(
        'activity-1',
        'user-1',
        true,
      );

      expect(result).toEqual(
        expect.objectContaining({ status: ParticipantStatus.CONFIRMED }),
      );
    });
  });

  describe('assignSubteam', () => {
    const internalChallenge = {
      id: 'activity-1',
      type: ActivityType.TRAINING,
      trainingMode: TrainingMode.INTERNAL_CHALLENGE,
      playersPerSubteam: 1,
      reservesPerSubteam: 1,
    };

    it('assigns a participant to a subteam slot', async () => {
      activitiesService.findById.mockResolvedValue(internalChallenge);
      participantRepository.findOne.mockResolvedValue({
        id: 'p-1',
        status: ParticipantStatus.PENDING,
        subteam: null,
        participantRole: null,
      });
      participantRepository.count.mockResolvedValue(0);

      const result = await service.assignSubteam(
        'activity-1',
        'captain-1',
        'user-1',
        Subteam.ONE,
        ParticipantRole.STARTER,
      );

      expect(result).toEqual(
        expect.objectContaining({
          subteam: Subteam.ONE,
          participantRole: ParticipantRole.STARTER,
          status: ParticipantStatus.CONFIRMED,
        }),
      );
    });

    it('rejects assignment when the subteam slot is full', async () => {
      activitiesService.findById.mockResolvedValue(internalChallenge);
      participantRepository.findOne.mockResolvedValue({
        id: 'p-1',
        status: ParticipantStatus.PENDING,
        subteam: null,
        participantRole: null,
      });
      participantRepository.count.mockResolvedValue(1);

      await expect(
        service.assignSubteam(
          'activity-1',
          'captain-1',
          'user-1',
          Subteam.ONE,
          ParticipantRole.STARTER,
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('rejects assignment on a non internal-challenge activity', async () => {
      activitiesService.findById.mockResolvedValue({
        type: ActivityType.TRAINING,
        trainingMode: TrainingMode.CLASSIC,
      });

      await expect(
        service.assignSubteam(
          'activity-1',
          'captain-1',
          'user-1',
          Subteam.ONE,
          ParticipantRole.STARTER,
        ),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('withdraw', () => {
    it('cancels the participation', async () => {
      participantRepository.findOne.mockResolvedValue({
        id: 'p-1',
        status: ParticipantStatus.CONFIRMED,
      });

      await service.withdraw('activity-1', 'user-1');

      expect(participantRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({ status: ParticipantStatus.CANCELLED }),
      );
    });

    it('throws when the user is not registered', async () => {
      participantRepository.findOne.mockResolvedValue(null);

      await expect(service.withdraw('activity-1', 'user-1')).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
