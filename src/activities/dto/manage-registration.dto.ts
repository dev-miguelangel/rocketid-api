import { IsEnum } from 'class-validator';

export enum RegistrationAction {
  CONFIRM = 'confirm',
  REJECT = 'reject',
}

export class ManageRegistrationDto {
  @IsEnum(RegistrationAction, {
    message: 'La acción debe ser: confirm o reject',
  })
  action!: RegistrationAction;
}
