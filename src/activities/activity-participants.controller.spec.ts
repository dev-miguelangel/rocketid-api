import { Test, TestingModule } from '@nestjs/testing';
import { ActivityParticipantsController } from './activity-participants.controller';
import { ActivityParticipantsService } from './activity-participants.service';
import {
  ManageRegistrationDto,
  RegistrationAction,
} from './dto/manage-registration.dto';
import { InviteParticipantsDto } from './dto/invite-participants.dto';
import { AssignSubteamDto } from './dto/assign-subteam.dto';
import { ParticipantStatus } from './enums/participant-status.enum';
import { Subteam } from './enums/subteam.enum';
import { ParticipantRole } from './enums/participant-role.enum';

describe('ActivityParticipantsController', () => {
  let controller: ActivityParticipantsController;
  let service: {
    listParticipants: jest.Mock;
    register: jest.Mock;
    withdraw: jest.Mock;
    manageRegistration: jest.Mock;
    inviteParticipants: jest.Mock;
    respondToInvitation: jest.Mock;
    confirmAttendance: jest.Mock;
    assignSubteam: jest.Mock;
  };

  const req = { user: { id: 'user-1' } } as never;

  beforeEach(async () => {
    service = {
      listParticipants: jest.fn().mockResolvedValue([]),
      register: jest.fn().mockResolvedValue({ id: 'p-1' }),
      withdraw: jest.fn().mockResolvedValue(undefined),
      manageRegistration: jest.fn().mockResolvedValue({ id: 'p-1' }),
      inviteParticipants: jest.fn().mockResolvedValue([]),
      respondToInvitation: jest.fn().mockResolvedValue({ id: 'p-1' }),
      confirmAttendance: jest.fn().mockResolvedValue({ id: 'p-1' }),
      assignSubteam: jest.fn().mockResolvedValue({ id: 'p-1' }),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [ActivityParticipantsController],
      providers: [{ provide: ActivityParticipantsService, useValue: service }],
    }).compile();

    controller = module.get<ActivityParticipantsController>(
      ActivityParticipantsController,
    );
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('delegates listParticipants with the status filter', async () => {
    await controller.listParticipants(
      'activity-1',
      req,
      ParticipantStatus.CONFIRMED,
    );
    expect(service.listParticipants).toHaveBeenCalledWith(
      'activity-1',
      'user-1',
      ParticipantStatus.CONFIRMED,
    );
  });

  it('delegates register', async () => {
    await controller.register('activity-1', req);
    expect(service.register).toHaveBeenCalledWith('activity-1', 'user-1');
  });

  it('delegates withdraw', async () => {
    await controller.withdraw('activity-1', req);
    expect(service.withdraw).toHaveBeenCalledWith('activity-1', 'user-1');
  });

  it('delegates manageRegistration with the action', async () => {
    const dto: ManageRegistrationDto = { action: RegistrationAction.CONFIRM };
    await controller.manageRegistration('activity-1', 'target-1', dto, req);
    expect(service.manageRegistration).toHaveBeenCalledWith(
      'activity-1',
      'user-1',
      'target-1',
      RegistrationAction.CONFIRM,
    );
  });

  it('delegates inviteParticipants with the user ids', async () => {
    const dto: InviteParticipantsDto = { userIds: ['contact-1'] };
    await controller.inviteParticipants('activity-1', dto, req);
    expect(service.inviteParticipants).toHaveBeenCalledWith(
      'activity-1',
      'user-1',
      ['contact-1'],
    );
  });

  it('delegates invitation accept and decline', async () => {
    await controller.acceptInvitation('activity-1', req);
    expect(service.respondToInvitation).toHaveBeenCalledWith(
      'activity-1',
      'user-1',
      true,
    );

    await controller.declineInvitation('activity-1', req);
    expect(service.respondToInvitation).toHaveBeenCalledWith(
      'activity-1',
      'user-1',
      false,
    );
  });

  it('delegates attendance confirm and decline', async () => {
    await controller.confirmAttendance('activity-1', req);
    expect(service.confirmAttendance).toHaveBeenCalledWith(
      'activity-1',
      'user-1',
      true,
    );

    await controller.declineAttendance('activity-1', req);
    expect(service.confirmAttendance).toHaveBeenCalledWith(
      'activity-1',
      'user-1',
      false,
    );
  });

  it('delegates assignSubteam with the dto fields', async () => {
    const dto: AssignSubteamDto = {
      userId: 'target-1',
      subteam: Subteam.ONE,
      participantRole: ParticipantRole.STARTER,
    };
    await controller.assignSubteam('activity-1', dto, req);
    expect(service.assignSubteam).toHaveBeenCalledWith(
      'activity-1',
      'user-1',
      'target-1',
      Subteam.ONE,
      ParticipantRole.STARTER,
    );
  });
});
