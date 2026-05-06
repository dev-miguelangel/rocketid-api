import { IsOptional, IsString, Matches, MaxLength, MinLength } from 'class-validator';

export class CreateProfileDto {
  @IsOptional()
  @IsString()
  phone?: string;

  @IsString()
  @MinLength(3)
  @MaxLength(30)
  @Matches(/^[a-zA-Z0-9_]+$/, {
    message: 'El alias solo puede contener letras, números y guiones bajos',
  })
  alias!: string;
}
