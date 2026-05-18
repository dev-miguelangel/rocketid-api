import {
  IsBoolean,
  IsDateString,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

/**
 * Only common fields are updatable. The activity `type` and its type-specific
 * fields are immutable after creation to keep the participant roster coherent.
 */
export class UpdateActivityDto {
  @IsOptional()
  @IsString()
  @MaxLength(150)
  title?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsDateString({}, { message: 'La fecha de inicio debe ser una fecha válida' })
  startsAt?: string;

  @IsOptional()
  @IsDateString({}, { message: 'La fecha de fin debe ser una fecha válida' })
  endsAt?: string;

  @IsOptional()
  @IsBoolean()
  requiresRegistration?: boolean;

  @IsOptional()
  @IsDateString(
    {},
    { message: 'La fecha límite de inscripción debe ser una fecha válida' },
  )
  registrationDeadline?: string;

  @IsOptional()
  @IsNumber()
  @Min(-90, { message: 'La latitud debe estar entre -90 y 90' })
  @Max(90, { message: 'La latitud debe estar entre -90 y 90' })
  latitude?: number;

  @IsOptional()
  @IsNumber()
  @Min(-180, { message: 'La longitud debe estar entre -180 y 180' })
  @Max(180, { message: 'La longitud debe estar entre -180 y 180' })
  longitude?: number;

  @IsOptional()
  @IsString()
  locationInstructions?: string;
}
