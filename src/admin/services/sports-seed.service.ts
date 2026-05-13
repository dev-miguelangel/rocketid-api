import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Sport } from '../../sports/sports.entity';

interface SeedSport {
  name: string;
  label: string;
  icon: string;
  color: string;
}

const SPORTS_SEED: SeedSport[] = [
  { name: 'soccer', label: 'Fútbol', icon: 'sports_soccer', color: '#4CAF50' },
  { name: 'basketball', label: 'Baloncesto', icon: 'sports_basketball', color: '#FF9800' },
  { name: 'volleyball', label: 'Voleibol', icon: 'sports_volleyball', color: '#2196F3' },
  { name: 'tennis', label: 'Tenis', icon: 'sports_tennis', color: '#9C27B0' },
  { name: 'cycling', label: 'Ciclismo', icon: 'directions_bike', color: '#E91E63' },
  { name: 'rock_climbing', label: 'Escalada', icon: 'rock_climbing', color: '#795548' },
  { name: 'hiking', label: 'Senderismo', icon: 'hiking', color: '#607D8B' },
  { name: 'rugby', label: 'Rugby', icon: 'rugby', color: '#F44336' },
];

@Injectable()
export class SportsSeedService {
  constructor(
    @InjectRepository(Sport)
    private readonly sportRepository: Repository<Sport>,
  ) {}

  async seed(): Promise<{ inserted: number; skipped: number }> {
    let inserted = 0;
    let skipped = 0;

    for (const sportData of SPORTS_SEED) {
      const existing = await this.sportRepository.findOneBy({
        name: sportData.name,
      });

      if (!existing) {
        const sport = this.sportRepository.create({
          ...sportData,
          status: true,
        });
        await this.sportRepository.save(sport);
        inserted++;
      } else {
        skipped++;
      }
    }

    return { inserted, skipped };
  }
}