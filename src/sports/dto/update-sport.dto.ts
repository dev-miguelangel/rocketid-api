import {
  IsString,
  IsOptional,
  IsBoolean,
  Length,
  Matches,
} from 'class-validator';

export class UpdateSportDto {
  @IsOptional()
  @IsString()
  @Length(2, 100)
  @Matches(/^[a-z0-9_]+$/, {
    message: 'El nombre debe estar en minúsculas con guiones bajos',
  })
  name?: string;

  @IsOptional()
  @IsString()
  @Length(2, 150)
  label?: string;

  @IsOptional()
  @IsString()
  @Length(2, 100)
  icon?: string;

  @IsOptional()
  @IsString()
  @Length(4, 20)
  @Matches(/^#[0-9A-Fa-f]{6}$/, {
    message: 'El color debe ser un código hex válido (ej: #FF5722)',
  })
  color?: string;

  @IsOptional()
  @IsBoolean()
  status?: boolean;
}
