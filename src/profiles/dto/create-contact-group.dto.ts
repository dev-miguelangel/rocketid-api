import {
  IsString,
  IsOptional,
  IsArray,
  MaxLength,
  Matches,
} from 'class-validator';

export class CreateContactGroupDto {
  @IsString()
  @MaxLength(30)
  @Matches(/^[a-z0-9]+$/, {
    message: 'El nombre solo puede contener letras minúsculas y números',
  })
  name!: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  contactIds?: string[];
}
