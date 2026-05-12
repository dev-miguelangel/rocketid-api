import {
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Request,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ProfilesService, RequestUser } from './profiles.service';

interface AuthenticatedRequest extends Request {
  user: RequestUser;
}

@Controller('profiles/contacts')
export class ContactsController {
  constructor(private readonly profilesService: ProfilesService) {}

  @Get('suggestions')
  @UseGuards(JwtAuthGuard)
  getSuggestedContacts(@Request() req: AuthenticatedRequest) {
    return this.profilesService.getSuggestedContacts(req.user.id);
  }

  @Get()
  @UseGuards(JwtAuthGuard)
  getContacts(@Request() req: AuthenticatedRequest) {
    return this.profilesService.getContacts(req.user.id);
  }

  @Post(':stringId')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.CREATED)
  addContact(
    @Param('stringId') stringId: string,
    @Request() req: AuthenticatedRequest,
  ) {
    return this.profilesService.addContact(req.user.id, stringId);
  }

  @Delete(':stringId')
  @UseGuards(JwtAuthGuard)
  removeContact(
    @Param('stringId') stringId: string,
    @Request() req: AuthenticatedRequest,
  ) {
    return this.profilesService.removeContact(req.user.id, stringId);
  }
}
