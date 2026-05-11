import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsArray,
  IsEnum,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';
import { BloodType } from '../enums/blood-type.enum';

export class UpdateProfileDto {
  @ApiPropertyOptional({ example: '+56912345678' })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiPropertyOptional({ example: 'miguelangel', minLength: 3, maxLength: 30 })
  @IsOptional()
  @IsString()
  @MinLength(3)
  @MaxLength(30)
  @Matches(/^[a-zA-Z0-9_]+$/, {
    message: 'El alias solo puede contener letras, números y guiones bajos',
  })
  alias?: string;

  // ── Emergency info ─────────────────────────────────────────────────────────

  @ApiPropertyOptional({ enum: BloodType, example: BloodType.O_POSITIVE })
  @IsOptional()
  @IsEnum(BloodType, { message: 'Tipo de sangre inválido' })
  bloodType?: BloodType;

  @ApiPropertyOptional({ type: [String], example: ['Penicilina', 'Polen'] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  allergies?: string[];

  @ApiPropertyOptional({ example: 'Hipertensión, Diabetes tipo 2' })
  @IsOptional()
  @IsString()
  conditions?: string;

  @ApiPropertyOptional({
    type: [String],
    example: ['Metformina 850mg', 'Losartán 50mg'],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  medications?: string[];

  // ── Emergency contact ──────────────────────────────────────────────────────

  @ApiPropertyOptional({ example: 'María González' })
  @IsOptional()
  @IsString()
  emergencyContactName?: string;

  @ApiPropertyOptional({ example: '+56987654321' })
  @IsOptional()
  @IsString()
  emergencyContactPhone?: string;

  @ApiPropertyOptional({ example: 'Madre' })
  @IsOptional()
  @IsString()
  emergencyContactRelationship?: string;
}
