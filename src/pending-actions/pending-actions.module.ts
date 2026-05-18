import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ActivityParticipant } from '../activities/entities/activity-participant.entity';
import { Activity } from '../activities/entities/activity.entity';
import { TeamMember } from '../teams/entities/team-member.entity';
import { PendingActionsController } from './pending-actions.controller';
import { PendingActionsService } from './pending-actions.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([TeamMember, ActivityParticipant, Activity]),
  ],
  controllers: [PendingActionsController],
  providers: [PendingActionsService],
})
export class PendingActionsModule {}
