import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsArray,
  IsEnum,
  IsOptional,
  IsString,
  ValidateIf,
} from 'class-validator';
import { BloodType } from '../../profiles/enums/blood-type.enum';
import { Gender } from '../enums/gender.enum';

export class UpdateOnboardingDto {
  @ApiPropertyOptional({ example: '+56912345678' })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiPropertyOptional({ example: '1990-05-15' })
  @IsOptional()
  @IsString()
  birthDate?: string;

  @ApiPropertyOptional({ enum: Gender, example: Gender.MALE })
  @IsOptional()
  @IsEnum(Gender, { message: 'Género inválido' })
  gender?: Gender;

  @ApiPropertyOptional({ example: 'Santiago' })
  @IsOptional()
  @IsString()
  city?: string;

  @ApiPropertyOptional({ enum: BloodType, example: BloodType.O_POSITIVE })
  @ValidateIf((o) => o.bloodType !== undefined)
  @IsEnum(BloodType, { message: 'Tipo de sangre inválido' })
  bloodType?: BloodType;

  @ApiPropertyOptional({ type: [String], example: ['Penicilina', 'Polen'] })
  @ValidateIf((o) => o.allergies !== undefined)
  @IsArray()
  @IsString({ each: true })
  allergies?: string[];

  @ApiPropertyOptional({ example: 'Hipertensión, Diabetes tipo 2' })
  @ValidateIf((o) => o.conditions !== undefined)
  @IsString()
  conditions?: string;

  @ApiPropertyOptional({
    type: [String],
    example: ['Metformina 850mg', 'Losartán 50mg'],
  })
  @ValidateIf((o) => o.medications !== undefined)
  @IsArray()
  @IsString({ each: true })
  medications?: string[];

  @ApiPropertyOptional({ example: 'María González' })
  @ValidateIf((o) => o.emergencyContactName !== undefined)
  @IsString()
  emergencyContactName?: string;

  @ApiPropertyOptional({ example: '+56987654321' })
  @ValidateIf((o) => o.emergencyContactPhone !== undefined)
  @IsString()
  emergencyContactPhone?: string;

  @ApiPropertyOptional({ example: 'Madre' })
  @ValidateIf((o) => o.emergencyContactRelationship !== undefined)
  @IsString()
  emergencyContactRelationship?: string;
}
