import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ProfilesService } from '../profiles/profiles.service';
import { ActivitiesService } from './activities.service';
import { Activity } from './entities/activity.entity';
import { ActivityParticipant } from './entities/activity-participant.entity';
import { ActivityType } from './enums/activity-type.enum';
import { ActivityStatus } from './enums/activity-status.enum';
import { TrainingMode } from './enums/training-mode.enum';
import { OpenCallMode } from './enums/open-call-mode.enum';
import { ParticipantStatus } from './enums/participant-status.enum';
import { Subteam } from './enums/subteam.enum';
import { ParticipantRole } from './enums/participant-role.enum';
import { RegistrationAction } from './dto/manage-registration.dto';

@Injectable()
export class ActivityParticipantsService {
  constructor(
    @InjectRepository(ActivityParticipant)
    private readonly participantRepository: Repository<ActivityParticipant>,
    private readonly activitiesService: ActivitiesService,
    private readonly profilesService: ProfilesService,
  ) {}

  async register(
    activityId: string,
    userId: string,
  ): Promise<ActivityParticipant> {
    const activity = await this.activitiesService.findById(activityId);

    if (activity.type !== ActivityType.OPEN_CALL) {
      throw new BadRequestException(
        'Esta actividad no admite inscripción directa',
      );
    }
    if (activity.status !== ActivityStatus.SCHEDULED) {
      throw new BadRequestException('La actividad no admite inscripciones');
    }
    if (activity.openCallMode === OpenCallMode.PRIVATE) {
      throw new BadRequestException('Esta convocatoria es solo por invitación');
    }
    this.assertRegistrationWindowOpen(activity);

    const existing = await this.participantRepository.findOne({
      where: { activityId, userId },
    });
    if (existing) {
      throw new ConflictException('Ya estás inscrito en esta actividad');
    }

    let status = ParticipantStatus.PENDING;
    if (activity.openCallMode === OpenCallMode.OPEN) {
      await this.assertHasCapacity(activity);
      status = ParticipantStatus.CONFIRMED;
    }

    const participant = this.participantRepository.create({
      activityId,
      userId,
      status,
    });
    return this.participantRepository.save(participant);
  }

  async withdraw(activityId: string, userId: string): Promise<void> {
    const participant = await this.participantRepository.findOne({
      where: { activityId, userId },
    });
    if (!participant) {
      throw new NotFoundException('No estás inscrito en esta actividad');
    }
    participant.status = ParticipantStatus.CANCELLED;
    await this.participantRepository.save(participant);
  }

  async listParticipants(
    activityId: string,
    userId: string,
    status?: ParticipantStatus,
  ): Promise<ActivityParticipant[]> {
    const activity = await this.activitiesService.findById(activityId);
    await this.activitiesService.checkCanManage(userId, activity);

    return this.participantRepository.find({
      where: status ? { activityId, status } : { activityId },
      relations: ['user', 'user.profile'],
      order: { createdAt: 'ASC' },
    });
  }

  async manageRegistration(
    activityId: string,
    organizerId: string,
    targetUserId: string,
    action: RegistrationAction,
  ): Promise<ActivityParticipant> {
    const activity = await this.activitiesService.findById(activityId);
    await this.activitiesService.checkCanManage(organizerId, activity);

    if (
      activity.type !== ActivityType.OPEN_CALL ||
      activity.openCallMode !== OpenCallMode.PUBLIC
    ) {
      throw new BadRequestException('Solo aplica a convocatorias públicas');
    }

    const participant = await this.participantRepository.findOne({
      where: {
        activityId,
        userId: targetUserId,
        status: ParticipantStatus.PENDING,
      },
    });
    if (!participant) {
      throw new NotFoundException('Solicitud no encontrada');
    }

    if (action === RegistrationAction.CONFIRM) {
      await this.assertHasCapacity(activity);
      participant.status = ParticipantStatus.CONFIRMED;
    } else {
      participant.status = ParticipantStatus.DECLINED;
    }
    return this.participantRepository.save(participant);
  }

  async inviteParticipants(
    activityId: string,
    organizerId: string,
    userIds: string[],
  ): Promise<ActivityParticipant[]> {
    const activity = await this.activitiesService.findById(activityId);
    await this.activitiesService.checkCanManage(organizerId, activity);

    const isPrivateOpenCall =
      activity.type === ActivityType.OPEN_CALL &&
      activity.openCallMode === OpenCallMode.PRIVATE;
    const isInternalChallenge =
      activity.type === ActivityType.TRAINING &&
      activity.trainingMode === TrainingMode.INTERNAL_CHALLENGE;

    if (!isPrivateOpenCall && !isInternalChallenge) {
      throw new BadRequestException('Esta actividad no admite invitaciones');
    }
    if (isInternalChallenge && !activity.allowExternals) {
      throw new BadRequestException(
        'El entrenamiento no permite participantes externos',
      );
    }
    if (isPrivateOpenCall) {
      await this.assertAllAreContacts(organizerId, userIds);
    }

    const existing = await this.participantRepository.find({
      where: { activityId },
      select: ['userId'],
    });
    const alreadyInvited = new Set(existing.map((row) => row.userId));

    const rows = userIds
      .filter((userId) => !alreadyInvited.has(userId))
      .map((userId) =>
        this.participantRepository.create({
          activityId,
          userId,
          status: ParticipantStatus.INVITED,
          invitedById: organizerId,
          isExternal: isInternalChallenge,
        }),
      );

    if (rows.length === 0) {
      return [];
    }
    return this.participantRepository.save(rows);
  }

  async respondToInvitation(
    activityId: string,
    userId: string,
    accept: boolean,
  ): Promise<ActivityParticipant> {
    const participant = await this.participantRepository.findOne({
      where: { activityId, userId, status: ParticipantStatus.INVITED },
    });
    if (!participant) {
      throw new NotFoundException('No tienes una invitación pendiente');
    }

    if (accept) {
      const activity = await this.activitiesService.findById(activityId);
      if (activity.type === ActivityType.OPEN_CALL) {
        await this.assertHasCapacity(activity);
      }
      participant.status = ParticipantStatus.CONFIRMED;
    } else {
      participant.status = ParticipantStatus.DECLINED;
    }
    participant.respondedAt = new Date();
    return this.participantRepository.save(participant);
  }

  async confirmAttendance(
    activityId: string,
    userId: string,
    accept: boolean,
  ): Promise<ActivityParticipant> {
    const activity = await this.activitiesService.findById(activityId);
    if (activity.type !== ActivityType.TRAINING) {
      throw new BadRequestException('Solo aplica a entrenamientos');
    }

    const participant = await this.participantRepository.findOne({
      where: { activityId, userId, status: ParticipantStatus.PENDING },
    });
    if (!participant) {
      throw new NotFoundException('No estás convocado a este entrenamiento');
    }

    participant.status = accept
      ? ParticipantStatus.CONFIRMED
      : ParticipantStatus.DECLINED;
    return this.participantRepository.save(participant);
  }

  async assignSubteam(
    activityId: string,
    requesterId: string,
    userId: string,
    subteam: Subteam,
    participantRole: ParticipantRole,
  ): Promise<ActivityParticipant> {
    const activity = await this.activitiesService.findById(activityId);

    if (
      activity.type !== ActivityType.TRAINING ||
      activity.trainingMode !== TrainingMode.INTERNAL_CHALLENGE
    ) {
      throw new BadRequestException(
        'Solo aplica a entrenamientos de desafío interno',
      );
    }
    await this.activitiesService.checkCanManage(requesterId, activity);

    const participant = await this.participantRepository.findOne({
      where: { activityId, userId },
    });
    if (!participant) {
      throw new NotFoundException('Participante no encontrado');
    }
    if (
      participant.status === ParticipantStatus.DECLINED ||
      participant.status === ParticipantStatus.CANCELLED
    ) {
      throw new BadRequestException('El participante no está disponible');
    }

    const alreadyInSlot =
      participant.subteam === subteam &&
      participant.participantRole === participantRole;
    if (!alreadyInSlot) {
      const limit =
        participantRole === ParticipantRole.STARTER
          ? (activity.playersPerSubteam ?? 0)
          : (activity.reservesPerSubteam ?? 0);
      const occupied = await this.participantRepository.count({
        where: { activityId, subteam, participantRole },
      });
      if (occupied >= limit) {
        throw new BadRequestException('Subequipo completo');
      }
    }

    participant.subteam = subteam;
    participant.participantRole = participantRole;
    participant.status = ParticipantStatus.CONFIRMED;
    return this.participantRepository.save(participant);
  }

  private assertRegistrationWindowOpen(activity: Activity): void {
    const now = new Date();
    if (now >= activity.startsAt) {
      throw new BadRequestException('La actividad ya inició');
    }
    if (
      activity.requiresRegistration &&
      activity.registrationDeadline &&
      now > activity.registrationDeadline
    ) {
      throw new BadRequestException('El plazo de inscripción ha cerrado');
    }
  }

  private async assertHasCapacity(activity: Activity): Promise<void> {
    if (activity.maxParticipants == null) {
      return;
    }
    const confirmed = await this.participantRepository.count({
      where: { activityId: activity.id, status: ParticipantStatus.CONFIRMED },
    });
    if (confirmed >= activity.maxParticipants) {
      throw new ConflictException('No hay cupos disponibles');
    }
  }

  private async assertAllAreContacts(
    organizerId: string,
    userIds: string[],
  ): Promise<void> {
    const contacts = await this.profilesService.getContacts(organizerId);
    const contactUserIds = new Set(contacts.map((contact) => contact.user.id));
    const notContacts = userIds.filter((id) => !contactUserIds.has(id));
    if (notContacts.length > 0) {
      throw new BadRequestException(
        'Solo puedes invitar a usuarios de tus contactos',
      );
    }
  }
}
