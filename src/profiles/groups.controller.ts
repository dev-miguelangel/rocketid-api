import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Request,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { GroupsService } from './groups.service';
import { RequestUser } from './profiles.service';
import { CreateContactGroupDto } from './dto/create-contact-group.dto';
import { UpdateContactGroupDto } from './dto/update-contact-group.dto';
import { UpdateGroupContactsDto } from './dto/update-group-contacts.dto';

interface AuthenticatedRequest extends Request {
  user: RequestUser;
}

@Controller('profiles/groups')
@UseGuards(JwtAuthGuard)
export class GroupsController {
  constructor(private readonly groupsService: GroupsService) {}

  @Post()
  create(
    @Body() dto: CreateContactGroupDto,
    @Request() req: AuthenticatedRequest,
  ) {
    return this.groupsService.create(req.user.id, dto);
  }

  @Get()
  findAll(@Request() req: AuthenticatedRequest) {
    return this.groupsService.findAll(req.user.id);
  }

  @Get(':id')
  findOne(
    @Param('id') id: string,
    @Request() req: AuthenticatedRequest,
  ) {
    return this.groupsService.findOne(req.user.id, id);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() dto: UpdateContactGroupDto,
    @Request() req: AuthenticatedRequest,
  ) {
    return this.groupsService.update(req.user.id, id, dto);
  }

  @Delete(':id')
  remove(
    @Param('id') id: string,
    @Request() req: AuthenticatedRequest,
  ) {
    return this.groupsService.remove(req.user.id, id);
  }

  @Post(':id/contacts')
  addContacts(
    @Param('id') id: string,
    @Body() dto: UpdateGroupContactsDto,
    @Request() req: AuthenticatedRequest,
  ) {
    return this.groupsService.addContacts(req.user.id, id, dto.contactIds);
  }

  @Delete(':id/contacts')
  removeContacts(
    @Param('id') id: string,
    @Body() dto: UpdateGroupContactsDto,
    @Request() req: AuthenticatedRequest,
  ) {
    return this.groupsService.removeContacts(req.user.id, id, dto.contactIds);
  }
}