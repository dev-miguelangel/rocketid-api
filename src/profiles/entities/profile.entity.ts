import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  OneToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { BloodType } from '../enums/blood-type.enum';

@Entity('profiles')
export class Profile {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @OneToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn()
  user!: User;

  @Column()
  userId!: string;

  @Column({ nullable: true, type: 'varchar' })
  phone!: string | null;

  @Column({ unique: true })
  alias!: string;

  @Column({ unique: true, length: 6 })
  stringId!: string;

  // ── Emergency info ─────────────────────────────────────────────────────────

  @Column({ type: 'enum', enum: BloodType, nullable: true })
  bloodType!: BloodType | null;

  @Column({ type: 'simple-array', nullable: true })
  allergies!: string[] | null;

  @Column({ type: 'text', nullable: true })
  conditions!: string | null;

  @Column({ type: 'simple-array', nullable: true })
  medications!: string[] | null;

  // ── Emergency contact ──────────────────────────────────────────────────────

  @Column({ nullable: true, type: 'varchar' })
  emergencyContactName!: string | null;

  @Column({ nullable: true, type: 'varchar' })
  emergencyContactPhone!: string | null;

  @Column({ nullable: true, type: 'varchar' })
  emergencyContactRelationship!: string | null;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
