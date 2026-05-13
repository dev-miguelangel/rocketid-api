import {
  Column,
  CreateDateColumn,
  Entity,
  JoinTable,
  ManyToMany,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Profile } from './profile.entity';

@Entity('contact_groups')
export class ContactGroup {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ length: 30 })
  name!: string;

  @ManyToOne(() => Profile, { onDelete: 'CASCADE' })
  owner!: Profile;

  @ManyToMany(() => Profile, (profile) => profile.contactGroups)
  @JoinTable({
    name: 'profile_contact_group_contacts',
    joinColumn: { name: 'group_id', referencedColumnName: 'id' },
    inverseJoinColumn: { name: 'contact_id', referencedColumnName: 'id' },
  })
  contacts!: Profile[];

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
