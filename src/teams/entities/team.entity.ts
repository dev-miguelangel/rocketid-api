import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { Sport } from '../../sports/sports.entity';
import { TeamGender } from '../enums/team-gender.enum';
import { TeamMember } from './team-member.entity';

@Entity('teams')
export class Team {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', length: 100 })
  name!: string;

  @Column({ type: 'text', nullable: true })
  description!: string | null;

  @Column({ type: 'varchar', length: 100 })
  icon!: string;

  @Column({ type: 'varchar', length: 20 })
  color!: string;

  @Column({ type: 'enum', enum: TeamGender })
  gender!: TeamGender;

  @ManyToOne(() => Sport, { onDelete: 'CASCADE', nullable: false })
  @JoinColumn({ name: 'sport_id' })
  sport!: Sport;

  @Column({ name: 'sport_id' })
  sportId!: number;

  @ManyToOne(() => User, { onDelete: 'CASCADE', nullable: false })
  @JoinColumn({ name: 'owner_id' })
  owner!: User;

  @Column({ name: 'owner_id' })
  ownerId!: string;

  @OneToMany(() => TeamMember, (member) => member.team)
  members!: TeamMember[];

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
