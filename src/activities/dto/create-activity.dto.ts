import {
  IsBoolean,
  IsDateString,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
  ValidateIf,
} from 'class-validator';
import { ActivityType } from '../enums/activity-type.enum';
import { TrainingMode } from '../enums/training-mode.enum';
import { OpenCallMode } from '../enums/open-call-mode.enum';

export class CreateActivityDto {
  @IsEnum(ActivityType, {
    message: 'El tipo debe ser: challenge, training u open_call',
  })
  type!: ActivityType;

  @IsString()
  @IsNotEmpty()
  @MaxLength(150)
  title!: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsInt()
  sportId!: number;

  @IsDateString({}, { message: 'La fecha de inicio debe ser una fecha válida' })
  startsAt!: string;

  @IsDateString({}, { message: 'La fecha de fin debe ser una fecha válida' })
  endsAt!: string;

  @IsBoolean()
  requiresRegistration!: boolean;

  @ValidateIf((o: CreateActivityDto) => o.requiresRegistration === true)
  @IsDateString(
    {},
    { message: 'La fecha límite de inscripción debe ser una fecha válida' },
  )
  registrationDeadline?: string;

  @IsNumber()
  @Min(-90, { message: 'La latitud debe estar entre -90 y 90' })
  @Max(90, { message: 'La latitud debe estar entre -90 y 90' })
  latitude!: number;

  @IsNumber()
  @Min(-180, { message: 'La longitud debe estar entre -180 y 180' })
  @Max(180, { message: 'La longitud debe estar entre -180 y 180' })
  longitude!: number;

  @IsOptional()
  @IsString()
  locationInstructions?: string;

  // ── Challenge ──────────────────────────────────────────────────────────────

  @ValidateIf((o: CreateActivityDto) => o.type === ActivityType.CHALLENGE)
  @IsUUID()
  teamOneId?: string;

  @ValidateIf((o: CreateActivityDto) => o.type === ActivityType.CHALLENGE)
  @IsUUID()
  teamTwoId?: string;

  // ── Training ───────────────────────────────────────────────────────────────

  @ValidateIf((o: CreateActivityDto) => o.type === ActivityType.TRAINING)
  @IsUUID()
  teamId?: string;

  @ValidateIf((o: CreateActivityDto) => o.type === ActivityType.TRAINING)
  @IsEnum(TrainingMode, {
    message:
      'La modalidad de entrenamiento debe ser: classic o internal_challenge',
  })
  trainingMode?: TrainingMode;

  @ValidateIf(
    (o: CreateActivityDto) =>
      o.type === ActivityType.TRAINING &&
      o.trainingMode === TrainingMode.INTERNAL_CHALLENGE,
  )
  @IsInt()
  @Min(1, { message: 'Debe haber al menos 1 jugador por subequipo' })
  playersPerSubteam?: number;

  @ValidateIf(
    (o: CreateActivityDto) =>
      o.type === ActivityType.TRAINING &&
      o.trainingMode === TrainingMode.INTERNAL_CHALLENGE,
  )
  @IsInt()
  @Min(0, { message: 'Las reservas por subequipo no pueden ser negativas' })
  reservesPerSubteam?: number;

  @IsOptional()
  @IsBoolean()
  allowExternals?: boolean;

  // ── Open call ──────────────────────────────────────────────────────────────

  @ValidateIf((o: CreateActivityDto) => o.type === ActivityType.OPEN_CALL)
  @IsEnum(OpenCallMode, {
    message: 'La modalidad de convocatoria debe ser: open, public o private',
  })
  openCallMode?: OpenCallMode;

  @ValidateIf((o: CreateActivityDto) => o.type === ActivityType.OPEN_CALL)
  @IsInt()
  @Min(1, { message: 'El cupo máximo debe ser al menos 1' })
  maxParticipants?: number;
}
