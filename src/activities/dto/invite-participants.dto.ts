import { ArrayNotEmpty, IsArray, IsUUID } from 'class-validator';

export class InviteParticipantsDto {
  @IsArray()
  @ArrayNotEmpty({ message: 'Debes indicar al menos un usuario a invitar' })
  @IsUUID('4', { each: true })
  userIds!: string[];
}
