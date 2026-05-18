import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  JoinTable,
  ManyToMany,
  OneToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { BloodType } from '../enums/blood-type.enum';
import { Gender } from '../../users/enums/gender.enum';
import { ContactGroup } from './contact-group.entity';

@Entity('profiles')
export class Profile {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @OneToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn()
  user!: User;

  @Column({ nullable: true, type: 'date' })
  birthDate!: string | null;

  get age(): number | null {
    if (!this.birthDate) return null;
    const birth = new Date(this.birthDate);
    const today = new Date();
    let age = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
      age--;
    }
    return age;
  }

  @Column({ type: 'enum', enum: Gender, nullable: true })
  gender!: Gender | null;

  @Column({ nullable: true, type: 'varchar' })
  city!: string | null;

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

  // ── Contacts ───────────────────────────────────────────────────────────────

  @ManyToMany(() => Profile, (profile) => profile.addedBy)
  @JoinTable({
    name: 'profile_contacts',
    joinColumn: { name: 'owner_id', referencedColumnName: 'id' },
    inverseJoinColumn: { name: 'contact_id', referencedColumnName: 'id' },
  })
  contacts!: Profile[];

  @ManyToMany(() => Profile, (profile) => profile.contacts)
  addedBy!: Profile[];

  @ManyToMany(() => ContactGroup, (group) => group.contacts)
  contactGroups!: ContactGroup[];

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
