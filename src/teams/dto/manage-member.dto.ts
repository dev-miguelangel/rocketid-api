import { IsString, IsNotEmpty, IsEnum, IsOptional } from 'class-validator';
import { TeamRole } from '../enums/team-role.enum';

export enum MemberAction {
  ADD = 'add',
  REMOVE = 'remove',
  PROMOTE = 'promote',
  DEMOTE = 'demote',
}

export class ManageMemberDto {
  @IsString()
  @IsNotEmpty()
  userId!: string;

  @IsEnum(MemberAction, {
    message: 'La acción debe ser: add, remove, promote o demote',
  })
  action!: MemberAction;

  @IsOptional()
  @IsEnum(TeamRole, {
    message: 'El rol debe ser: captain o member',
  })
  role?: TeamRole;
}
