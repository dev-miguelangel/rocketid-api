import { IsString, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class GoogleTokenDto {
  @ApiProperty({ description: 'ID token obtenido del SDK de Google' })
  @IsString()
  @IsNotEmpty()
  idToken!: string;
}
