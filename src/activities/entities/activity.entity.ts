import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
  ValueTransformer,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { Sport } from '../../sports/sports.entity';
import { Team } from '../../teams/entities/team.entity';
import { ActivityType } from '../enums/activity-type.enum';
import { ActivityStatus } from '../enums/activity-status.enum';
import { TrainingMode } from '../enums/training-mode.enum';
import { OpenCallMode } from '../enums/open-call-mode.enum';
import { ActivityParticipant } from './activity-participant.entity';

// PostgreSQL returns `numeric` columns as strings; convert to/from `number`
// so coordinates are plain numbers in JSON responses.
const decimalTransformer: ValueTransformer = {
  to: (value: number | null): number | null => value,
  from: (value: string | null): number | null =>
    value === null ? null : parseFloat(value),
};

@Entity('activities')
export class Activity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'enum', enum: ActivityType })
  type!: ActivityType;

  @Column({
    type: 'enum',
    enum: ActivityStatus,
    default: ActivityStatus.SCHEDULED,
  })
  status!: ActivityStatus;

  @Column({ type: 'varchar', length: 150 })
  title!: string;

  @Column({ type: 'text', nullable: true })
  description!: string | null;

  // ── Common fields ──────────────────────────────────────────────────────────

  @ManyToOne(() => Sport, { onDelete: 'CASCADE', nullable: false })
  @JoinColumn({ name: 'sport_id' })
  sport!: Sport;

  @Column({ name: 'sport_id' })
  sportId!: number;

  @Column({ name: 'requires_registration', type: 'boolean', default: false })
  requiresRegistration!: boolean;

  @Column({ name: 'registration_deadline', type: 'timestamp', nullable: true })
  registrationDeadline!: Date | null;

  @Column({ name: 'starts_at', type: 'timestamp' })
  startsAt!: Date;

  @Column({ name: 'ends_at', type: 'timestamp' })
  endsAt!: Date;

  @Column({
    type: 'decimal',
    precision: 10,
    scale: 7,
    transformer: decimalTransformer,
  })
  latitude!: number;

  @Column({
    type: 'decimal',
    precision: 10,
    scale: 7,
    transformer: decimalTransformer,
  })
  longitude!: number;

  @Column({ name: 'location_instructions', type: 'text', nullable: true })
  locationInstructions!: string | null;

  @ManyToOne(() => User, { onDelete: 'CASCADE', nullable: false })
  @JoinColumn({ name: 'organizer_id' })
  organizer!: User;

  @Column({ name: 'organizer_id' })
  organizerId!: string;

  // ── Challenge-specific ─────────────────────────────────────────────────────

  @ManyToOne(() => Team, { onDelete: 'CASCADE', nullable: true })
  @JoinColumn({ name: 'team_one_id' })
  teamOne!: Team | null;

  @Column({ name: 'team_one_id', type: 'uuid', nullable: true })
  teamOneId!: string | null;

  @ManyToOne(() => Team, { onDelete: 'CASCADE', nullable: true })
  @JoinColumn({ name: 'team_two_id' })
  teamTwo!: Team | null;

  @Column({ name: 'team_two_id', type: 'uuid', nullable: true })
  teamTwoId!: string | null;

  // ── Training-specific ──────────────────────────────────────────────────────

  @ManyToOne(() => Team, { onDelete: 'CASCADE', nullable: true })
  @JoinColumn({ name: 'team_id' })
  team!: Team | null;

  @Column({ name: 'team_id', type: 'uuid', nullable: true })
  teamId!: string | null;

  @Column({
    name: 'training_mode',
    type: 'enum',
    enum: TrainingMode,
    nullable: true,
  })
  trainingMode!: TrainingMode | null;

  @Column({ name: 'players_per_subteam', type: 'int', nullable: true })
  playersPerSubteam!: number | null;

  @Column({ name: 'reserves_per_subteam', type: 'int', nullable: true })
  reservesPerSubteam!: number | null;

  @Column({ name: 'allow_externals', type: 'boolean', default: false })
  allowExternals!: boolean;

  // ── Open-call-specific ─────────────────────────────────────────────────────

  @Column({
    name: 'open_call_mode',
    type: 'enum',
    enum: OpenCallMode,
    nullable: true,
  })
  openCallMode!: OpenCallMode | null;

  @Column({ name: 'max_participants', type: 'int', nullable: true })
  maxParticipants!: number | null;

  // ── Relations & timestamps ─────────────────────────────────────────────────

  @OneToMany(() => ActivityParticipant, (participant) => participant.activity)
  participants!: ActivityParticipant[];

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
