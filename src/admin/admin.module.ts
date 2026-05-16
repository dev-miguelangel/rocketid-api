import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SportsSeedController } from './controllers/sports-seed.controller';
import { SportsSeedService } from './services/sports-seed.service';
import { Sport } from '../sports/sports.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Sport])],
  controllers: [SportsSeedController],
  providers: [SportsSeedService],
})
export class AdminModule {}
