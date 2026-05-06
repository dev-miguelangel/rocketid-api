import { IsString, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class RefreshTokenDto {
  @ApiProperty({ description: 'Refresh token emitido al autenticarse' })
  @IsString()
  @IsNotEmpty()
  refreshToken!: string;
}
