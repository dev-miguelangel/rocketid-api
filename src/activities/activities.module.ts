import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SportsModule } from '../sports/sports.module';
import { TeamsModule } from '../teams/teams.module';
import { ProfilesModule } from '../profiles/profiles.module';
import { Activity } from './entities/activity.entity';
import { ActivityParticipant } from './entities/activity-participant.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Activity, ActivityParticipant]),
    SportsModule,
    TeamsModule,
    ProfilesModule,
  ],
  controllers: [],
  providers: [],
  exports: [],
})
export class ActivitiesModule {}
