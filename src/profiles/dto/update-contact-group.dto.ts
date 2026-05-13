import { IsString, IsOptional, MaxLength, Matches } from 'class-validator';

export class UpdateContactGroupDto {
  @IsString()
  @IsOptional()
  @MaxLength(30)
  @Matches(/^[a-z0-9]+$/, {
    message: 'El nombre solo puede contener letras minúsculas y números',
  })
  name?: string;
}
