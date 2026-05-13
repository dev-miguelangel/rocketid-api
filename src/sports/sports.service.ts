import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreateSportDto } from './dto/create-sport.dto';
import { UpdateSportDto } from './dto/update-sport.dto';
import { Sport } from './sports.entity';

@Injectable()
export class SportsService {
  constructor(
    @InjectRepository(Sport)
    private readonly sportRepository: Repository<Sport>,
  ) {}

  async create(dto: CreateSportDto): Promise<Sport> {
    const existingByName = await this.sportRepository.findOneBy({
      name: dto.name,
    });
    if (existingByName) {
      throw new ConflictException('Ya existe un deporte con este nombre');
    }

    const sport = this.sportRepository.create({
      name: dto.name,
      label: dto.label,
      icon: dto.icon,
      color: dto.color,
      status: dto.status ?? true,
    });

    return this.sportRepository.save(sport);
  }

  async findAll(): Promise<Sport[]> {
    return this.sportRepository.find({
      order: { label: 'ASC' },
    });
  }

  async findOne(id: number): Promise<Sport> {
    const sport = await this.sportRepository.findOneBy({ id });
    if (!sport) {
      throw new NotFoundException('Deporte no encontrado');
    }
    return sport;
  }

  async update(id: number, dto: UpdateSportDto): Promise<Sport> {
    const sport = await this.findOne(id);

    if (dto.name !== undefined) {
      const existing = await this.sportRepository.findOneBy({ name: dto.name });
      if (existing && existing.id !== id) {
        throw new ConflictException('Ya existe un deporte con este nombre');
      }
      sport.name = dto.name;
    }

    if (dto.label !== undefined) sport.label = dto.label;
    if (dto.icon !== undefined) sport.icon = dto.icon;
    if (dto.color !== undefined) sport.color = dto.color;
    if (dto.status !== undefined) sport.status = dto.status;

    return this.sportRepository.save(sport);
  }

  async remove(id: number): Promise<void> {
    const sport = await this.findOne(id);
    await this.sportRepository.remove(sport);
  }
}
