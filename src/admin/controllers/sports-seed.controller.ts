import { Controller, Post } from '@nestjs/common';
import { SportsSeedService } from '../services/sports-seed.service';

@Controller('admin/seed')
export class SportsSeedController {
  constructor(private readonly sportsSeedService: SportsSeedService) {}

  @Post('sports')
  async seed() {
    const result = await this.sportsSeedService.seed();
    return {
      message: 'Seed de deportes completado',
      inserted: result.inserted,
      skipped: result.skipped,
    };
  }
}