import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SportsModule } from '../sports/sports.module';
import { TeamsModule } from '../teams/teams.module';
import { ProfilesModule } from '../profiles/profiles.module';
import { Activity } from './entities/activity.entity';
import { ActivityParticipant } from './entities/activity-participant.entity';
import { ActivitiesController } from './activities.controller';
import { ActivitiesService } from './activities.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([Activity, ActivityParticipant]),
    SportsModule,
    TeamsModule,
    ProfilesModule,
  ],
  controllers: [ActivitiesController],
  providers: [ActivitiesService],
  exports: [ActivitiesService],
})
export class ActivitiesModule {}
