import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsBoolean,
  Length,
  Matches,
} from 'class-validator';

export class CreateSportDto {
  @IsString()
  @IsNotEmpty()
  @Length(2, 100)
  @Matches(/^[a-z0-9_]+$/, {
    message: 'El nombre debe estar en minúsculas con guiones bajos',
  })
  name!: string;

  @IsString()
  @IsNotEmpty()
  @Length(2, 150)
  label!: string;

  @IsString()
  @IsNotEmpty()
  @Length(2, 100)
  icon!: string;

  @IsString()
  @IsNotEmpty()
  @Length(4, 20)
  @Matches(/^#[0-9A-Fa-f]{6}$/, {
    message: 'El color debe ser un código hex válido (ej: #FF5722)',
  })
  color!: string;

  @IsOptional()
  @IsBoolean()
  status?: boolean;
}
