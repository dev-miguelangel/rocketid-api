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
  // GroupsController y ContactsController van antes de ProfilesController:
  // sus paths (`profiles/contact-groups`, `profiles/contacts`) deben matchear
  // antes que el `@Get(':id')` de ProfilesController, que si no captura el
  // segmento "contact-groups" y revienta al castearlo a uuid.
  controllers: [ContactsController, GroupsController, ProfilesController],
  providers: [ProfilesService, GroupsService],
  exports: [ProfilesService],
})
export class ProfilesModule {}
