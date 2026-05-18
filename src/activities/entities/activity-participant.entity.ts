import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
  UpdateDateColumn,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { Activity } from './activity.entity';
import { ParticipantStatus } from '../enums/participant-status.enum';
import { Subteam } from '../enums/subteam.enum';
import { ParticipantRole } from '../enums/participant-role.enum';

@Entity('activity_participants')
@Unique(['activityId', 'userId'])
export class ActivityParticipant {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @ManyToOne(() => Activity, (activity) => activity.participants, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'activity_id' })
  activity!: Activity;

  @Column({ name: 'activity_id' })
  activityId!: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user!: User;

  @Column({ name: 'user_id' })
  userId!: string;

  @Column({
    type: 'enum',
    enum: ParticipantStatus,
    default: ParticipantStatus.PENDING,
  })
  status!: ParticipantStatus;

  @Column({ type: 'enum', enum: Subteam, nullable: true })
  subteam!: Subteam | null;

  @Column({
    name: 'participant_role',
    type: 'enum',
    enum: ParticipantRole,
    nullable: true,
  })
  participantRole!: ParticipantRole | null;

  @Column({ name: 'is_external', type: 'boolean', default: false })
  isExternal!: boolean;

  @ManyToOne(() => User, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'invited_by_id' })
  invitedBy!: User | null;

  @Column({ name: 'invited_by_id', type: 'uuid', nullable: true })
  invitedById!: string | null;

  @Column({ name: 'responded_at', type: 'timestamp', nullable: true })
  respondedAt!: Date | null;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
