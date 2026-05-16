import {
  IsString,
  IsOptional,
  IsEnum,
  IsInt,
  MinLength,
  MaxLength,
  IsIn,
} from 'class-validator';
import { TeamGender } from '../enums/team-gender.enum';
import { TEAM_COLORS } from '../constants/colors';

export class UpdateTeamDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  name?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  icon?: string;

  @IsOptional()
  @IsString()
  @IsIn(TEAM_COLORS, {
    message: 'El color debe ser uno de los permitidos',
  })
  color?: string;

  @IsOptional()
  @IsEnum(TeamGender, {
    message: 'El género debe ser: male, female o mixed',
  })
  gender?: TeamGender;

  @IsOptional()
  @IsInt()
  sportId?: number;
}
