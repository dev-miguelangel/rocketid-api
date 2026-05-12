import { IsArray, IsString, IsNotEmpty } from 'class-validator';

export class UpdateGroupContactsDto {
  @IsArray()
  @IsString({ each: true })
  @IsNotEmpty()
  contactIds!: string[];
}