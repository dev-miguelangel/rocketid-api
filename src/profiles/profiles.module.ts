import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ContactsController } from './contacts.controller';
import { ContactGroup } from './entities/contact-group.entity';
import { Profile } from './entities/profile.entity';
import { ProfilesController } from './profiles.controller';
import { ProfilesService } from './profiles.service';
import { GroupsController } from './groups.controller';
import { GroupsService } from './groups.service';

@Module({
  imports: [TypeOrmModule.forFeature([Profile, ContactGroup])],
  controllers: [ContactsController, ProfilesController, GroupsController],
  providers: [ProfilesService, GroupsService],
  exports: [ProfilesService],
})
export class ProfilesModule {}
