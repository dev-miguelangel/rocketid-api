import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SportsService } from '../sports/sports.service';
import { TeamsService } from '../teams/teams.service';
import { TeamRole } from '../teams/enums/team-role.enum';
import { MemberStatus } from '../teams/entities/team-member.entity';
import { Activity } from './entities/activity.entity';
import { ActivityParticipant } from './entities/activity-participant.entity';
import { ActivityType } from './enums/activity-type.enum';
import { ActivityStatus } from './enums/activity-status.enum';
import { TrainingMode } from './enums/training-mode.enum';
import { ParticipantStatus } from './enums/participant-status.enum';
import { Subteam } from './enums/subteam.enum';
import { CreateActivityDto } from './dto/create-activity.dto';
import { UpdateActivityDto } from './dto/update-activity.dto';
import { ListActivitiesQueryDto } from './dto/list-activities-query.dto';

const ONE_HOUR_MS = 60 * 60 * 1000;

@Injectable()
export class ActivitiesService {
  constructor(
    @InjectRepository(Activity)
    private readonly activityRepository: Repository<Activity>,
    @InjectRepository(ActivityParticipant)
    private readonly participantRepository: Repository<ActivityParticipant>,
    private readonly sportsService: SportsService,
    private readonly teamsService: TeamsService,
  ) {}

  async create(userId: string, dto: CreateActivityDto): Promise<Activity> {
    await this.sportsService.findOne(dto.sportId);
    this.validateDates(
      dto.startsAt,
      dto.endsAt,
      dto.requiresRegistration,
      dto.registrationDeadline,
    );

    const activity = this.activityRepository.create({
      type: dto.type,
      status: ActivityStatus.SCHEDULED,
      title: dto.title,
      description: dto.description ?? null,
      sportId: dto.sportId,
      requiresRegistration: dto.requiresRegistration,
      registrationDeadline:
        dto.requiresRegistration && dto.registrationDeadline
          ? new Date(dto.registrationDeadline)
          : null,
      startsAt: new Date(dto.startsAt),
      endsAt: new Date(dto.endsAt),
      latitude: dto.latitude,
      longitude: dto.longitude,
      locationInstructions: dto.locationInstructions ?? null,
      organizerId: userId,
      allowExternals: false,
    });

    if (dto.type === ActivityType.CHALLENGE) {
      await this.applyChallengeFields(userId, dto, activity);
    } else if (dto.type === ActivityType.TRAINING) {
      await this.applyTrainingFields(userId, dto, activity);
    } else {
      activity.openCallMode = dto.openCallMode ?? null;
      activity.maxParticipants = dto.maxParticipants ?? null;
    }

    const saved = await this.activityRepository.save(activity);
    await this.seedParticipants(saved);
    return this.findById(saved.id);
  }

  async findAll(query: ListActivitiesQueryDto): Promise<Activity[]> {
    const qb = this.activityRepository
      .createQueryBuilder('activity')
      .leftJoinAndSelect('activity.sport', 'sport')
      .leftJoinAndSelect('activity.organizer', 'organizer')
      .leftJoinAndSelect('activity.teamOne', 'teamOne')
      .leftJoinAndSelect('activity.teamTwo', 'teamTwo')
      .leftJoinAndSelect('activity.team', 'team');

    if (query.from) {
      qb.andWhere('activity.startsAt >= :from', { from: query.from });
    }
    if (query.to) {
      qb.andWhere('activity.startsAt <= :to', { to: query.to });
    }
    if (query.type) {
      qb.andWhere('activity.type = :type', { type: query.type });
    }
    if (query.status) {
      qb.andWhere('activity.status = :status', { status: query.status });
    }
    if (query.sportId) {
      qb.andWhere('activity.sportId = :sportId', {
        sportId: Number(query.sportId),
      });
    }
    if (query.teamId) {
      qb.andWhere(
        '(activity.teamId = :teamId OR activity.teamOneId = :teamId OR activity.teamTwoId = :teamId)',
        { teamId: query.teamId },
      );
    }

    return qb.orderBy('activity.startsAt', 'ASC').getMany();
  }

  async findById(id: string): Promise<Activity> {
    const activity = await this.activityRepository.findOne({
      where: { id },
      relations: [
        'sport',
        'organizer',
        'organizer.profile',
        'teamOne',
        'teamTwo',
        'team',
      ],
    });

    if (!activity) {
      throw new NotFoundException('Actividad no encontrada');
    }

    return activity;
  }

  async findMine(userId: string): Promise<Activity[]> {
    const participantRows = await this.participantRepository.find({
      where: { userId },
      select: ['activityId'],
    });
    const activityIds = participantRows.map((row) => row.activityId);

    const qb = this.activityRepository
      .createQueryBuilder('activity')
      .leftJoinAndSelect('activity.sport', 'sport')
      .leftJoinAndSelect('activity.organizer', 'organizer')
      .leftJoinAndSelect('activity.teamOne', 'teamOne')
      .leftJoinAndSelect('activity.teamTwo', 'teamTwo')
      .leftJoinAndSelect('activity.team', 'team');

    if (activityIds.length > 0) {
      qb.where(
        'activity.organizerId = :userId OR activity.id IN (:...activityIds)',
        { userId, activityIds },
      );
    } else {
      qb.where('activity.organizerId = :userId', { userId });
    }

    return qb.orderBy('activity.startsAt', 'ASC').getMany();
  }

  async update(
    id: string,
    userId: string,
    dto: UpdateActivityDto,
  ): Promise<Activity> {
    const activity = await this.findById(id);
    await this.checkCanManage(userId, activity);

    const datesTouched =
      dto.startsAt !== undefined ||
      dto.endsAt !== undefined ||
      dto.requiresRegistration !== undefined ||
      dto.registrationDeadline !== undefined;

    if (datesTouched) {
      const requiresRegistration =
        dto.requiresRegistration ?? activity.requiresRegistration;
      const registrationDeadline =
        dto.registrationDeadline ??
        activity.registrationDeadline?.toISOString();
      this.validateDates(
        dto.startsAt ?? activity.startsAt.toISOString(),
        dto.endsAt ?? activity.endsAt.toISOString(),
        requiresRegistration,
        registrationDeadline ?? undefined,
      );
    }

    if (dto.title !== undefined) activity.title = dto.title;
    if (dto.description !== undefined) activity.description = dto.description;
    if (dto.startsAt !== undefined) activity.startsAt = new Date(dto.startsAt);
    if (dto.endsAt !== undefined) activity.endsAt = new Date(dto.endsAt);
    if (dto.requiresRegistration !== undefined) {
      activity.requiresRegistration = dto.requiresRegistration;
    }
    if (dto.registrationDeadline !== undefined) {
      activity.registrationDeadline = dto.registrationDeadline
        ? new Date(dto.registrationDeadline)
        : null;
    }
    if (dto.latitude !== undefined) activity.latitude = dto.latitude;
    if (dto.longitude !== undefined) activity.longitude = dto.longitude;
    if (dto.locationInstructions !== undefined) {
      activity.locationInstructions = dto.locationInstructions;
    }

    await this.activityRepository.save(activity);
    return this.findById(id);
  }

  async cancel(id: string, userId: string): Promise<Activity> {
    const activity = await this.findById(id);
    await this.checkCanManage(userId, activity);
    activity.status = ActivityStatus.CANCELLED;
    await this.activityRepository.save(activity);
    return this.findById(id);
  }

  async remove(id: string, userId: string): Promise<void> {
    const activity = await this.findById(id);
    if (activity.organizerId !== userId) {
      throw new ForbiddenException(
        'Solo el organizador puede eliminar la actividad',
      );
    }
    await this.activityRepository.remove(activity);
  }

  /**
   * Asserts the user may manage the activity: the organizer always can; for
   * team-bound activities the team owner or captain can too.
   */
  async checkCanManage(userId: string, activity: Activity): Promise<void> {
    if (activity.organizerId === userId) {
      return;
    }

    if (
      activity.type === ActivityType.TRAINING &&
      (await this.isTeamManager(activity.teamId, userId))
    ) {
      return;
    }

    if (
      activity.type === ActivityType.CHALLENGE &&
      ((await this.isTeamManager(activity.teamOneId, userId)) ||
        (await this.isTeamManager(activity.teamTwoId, userId)))
    ) {
      return;
    }

    throw new ForbiddenException(
      'No tienes permisos para gestionar esta actividad',
    );
  }

  private async isTeamManager(
    teamId: string | null,
    userId: string,
  ): Promise<boolean> {
    if (!teamId) {
      return false;
    }
    const role = await this.teamsService.getUserRole(teamId, userId);
    return role === TeamRole.OWNER || role === TeamRole.CAPTAIN;
  }

  private validateDates(
    startsAt: string,
    endsAt: string,
    requiresRegistration: boolean,
    registrationDeadline?: string,
  ): void {
    const start = new Date(startsAt);
    const end = new Date(endsAt);
    const now = new Date();

    if (end <= start) {
      throw new BadRequestException(
        'La fecha de fin debe ser posterior a la de inicio',
      );
    }
    if (start <= now) {
      throw new BadRequestException(
        'La fecha de inicio debe estar en el futuro',
      );
    }

    if (requiresRegistration) {
      if (!registrationDeadline) {
        throw new BadRequestException(
          'La fecha límite de inscripción es requerida',
        );
      }
      const deadline = new Date(registrationDeadline);
      if (deadline.getTime() > start.getTime() - ONE_HOUR_MS) {
        throw new BadRequestException(
          'La inscripción debe cerrar al menos 1 hora antes del inicio',
        );
      }
      if (deadline < now) {
        throw new BadRequestException(
          'La fecha límite de inscripción no puede estar en el pasado',
        );
      }
    }
  }

  private async applyChallengeFields(
    userId: string,
    dto: CreateActivityDto,
    activity: Activity,
  ): Promise<void> {
    if (dto.teamOneId === dto.teamTwoId) {
      throw new BadRequestException(
        'Los equipos del desafío deben ser distintos',
      );
    }
    await this.teamsService.findById(dto.teamOneId as string);
    await this.teamsService.findById(dto.teamTwoId as string);

    const canManage =
      (await this.isTeamManager(dto.teamOneId as string, userId)) ||
      (await this.isTeamManager(dto.teamTwoId as string, userId));
    if (!canManage) {
      throw new ForbiddenException(
        'Debes ser capitán o propietario de uno de los equipos para crear el desafío',
      );
    }

    activity.teamOneId = dto.teamOneId as string;
    activity.teamTwoId = dto.teamTwoId as string;
  }

  private async applyTrainingFields(
    userId: string,
    dto: CreateActivityDto,
    activity: Activity,
  ): Promise<void> {
    await this.teamsService.findById(dto.teamId as string);

    const canManage = await this.isTeamManager(dto.teamId as string, userId);
    if (!canManage) {
      throw new ForbiddenException(
        'Debes ser capitán o propietario del equipo para crear el entrenamiento',
      );
    }

    activity.teamId = dto.teamId as string;
    activity.trainingMode = dto.trainingMode as TrainingMode;

    if (dto.trainingMode === TrainingMode.INTERNAL_CHALLENGE) {
      activity.playersPerSubteam = dto.playersPerSubteam ?? null;
      activity.reservesPerSubteam = dto.reservesPerSubteam ?? null;
      activity.allowExternals = dto.allowExternals ?? false;
    }
  }

  /**
   * Creates the initial participant rows for team-bound activities. Open calls
   * start with no participants — users register through the participants flow.
   */
  private async seedParticipants(activity: Activity): Promise<void> {
    if (activity.type === ActivityType.OPEN_CALL) {
      return;
    }

    const rows: ActivityParticipant[] = [];
    const seen = new Set<string>();

    const addTeamMembers = async (
      teamId: string,
      status: ParticipantStatus,
      subteam: Subteam | null,
    ): Promise<void> => {
      const members = await this.teamsService.getMembers(teamId);
      for (const member of members) {
        if (member.status !== MemberStatus.ACTIVE || seen.has(member.userId)) {
          continue;
        }
        seen.add(member.userId);
        rows.push(
          this.participantRepository.create({
            activityId: activity.id,
            userId: member.userId,
            status,
            subteam,
          }),
        );
      }
    };

    if (activity.type === ActivityType.CHALLENGE) {
      await addTeamMembers(
        activity.teamOneId as string,
        ParticipantStatus.CONFIRMED,
        Subteam.ONE,
      );
      await addTeamMembers(
        activity.teamTwoId as string,
        ParticipantStatus.CONFIRMED,
        Subteam.TWO,
      );
    } else {
      await addTeamMembers(
        activity.teamId as string,
        ParticipantStatus.PENDING,
        null,
      );
    }

    if (rows.length > 0) {
      await this.participantRepository.save(rows);
    }
  }
}
