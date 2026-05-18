import { IsEnum, IsUUID } from 'class-validator';
import { Subteam } from '../enums/subteam.enum';
import { ParticipantRole } from '../enums/participant-role.enum';

export class AssignSubteamDto {
  @IsUUID()
  userId!: string;

  @IsEnum(Subteam, { message: 'El subequipo debe ser: one o two' })
  subteam!: Subteam;

  @IsEnum(ParticipantRole, {
    message: 'El rol debe ser: starter o reserve',
  })
  participantRole!: ParticipantRole;
}
