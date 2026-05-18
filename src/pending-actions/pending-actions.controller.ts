import { Controller, Get, Request, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PendingActionsService } from './pending-actions.service';

interface RequestUser {
  id: string;
}

interface AuthenticatedRequest extends Request {
  user: RequestUser;
}

@Controller('pending-actions')
@UseGuards(JwtAuthGuard)
export class PendingActionsController {
  constructor(private readonly pendingActionsService: PendingActionsService) {}

  @Get()
  findPending(@Request() req: AuthenticatedRequest) {
    return this.pendingActionsService.getPendingActions(req.user.id);
  }
}
