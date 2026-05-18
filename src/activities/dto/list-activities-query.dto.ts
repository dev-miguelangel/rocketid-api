import {
  IsDateString,
  IsEnum,
  IsNumberString,
  IsOptional,
  IsUUID,
} from 'class-validator';
import { ActivityType } from '../enums/activity-type.enum';
import { ActivityStatus } from '../enums/activity-status.enum';

export class ListActivitiesQueryDto {
  @IsOptional()
  @IsDateString({}, { message: 'El parámetro from debe ser una fecha válida' })
  from?: string;

  @IsOptional()
  @IsDateString({}, { message: 'El parámetro to debe ser una fecha válida' })
  to?: string;

  @IsOptional()
  @IsEnum(ActivityType, {
    message: 'El tipo debe ser: challenge, training u open_call',
  })
  type?: ActivityType;

  @IsOptional()
  @IsEnum(ActivityStatus, {
    message:
      'El estado debe ser: scheduled, in_progress, completed o cancelled',
  })
  status?: ActivityStatus;

  @IsOptional()
  @IsNumberString({}, { message: 'El parámetro sportId debe ser numérico' })
  sportId?: string;

  @IsOptional()
  @IsUUID()
  teamId?: string;
}
