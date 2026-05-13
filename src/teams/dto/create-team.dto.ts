import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsEnum,
  IsInt,
  MinLength,
  MaxLength,
  IsIn,
} from 'class-validator';
import { TeamGender } from '../enums/team-gender.enum';
import { TEAM_COLORS } from '../constants/colors';

export class CreateTeamDto {
  @IsString()
  @IsNotEmpty()
  @MinLength(2)
  @MaxLength(100)
  name!: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  icon!: string;

  @IsString()
  @IsNotEmpty()
  @IsIn(TEAM_COLORS, {
    message: 'El color debe ser uno de los permitidos',
  })
  color!: string;

  @IsEnum(TeamGender, {
    message: 'El género debe ser: male, female o mixed',
  })
  gender!: TeamGender;

  @IsInt()
  sportId!: number;
}