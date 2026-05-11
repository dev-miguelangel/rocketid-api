import { Test, TestingModule } from '@nestjs/testing';
import { UserRole } from '../users/entities/user.entity';
import { Profile } from './entities/profile.entity';
import { ContactsController } from './contacts.controller';
import { ProfilesService, RequestUser } from './profiles.service';

const mockService = () => ({
  addContact: jest.fn(),
  getContacts: jest.fn(),
  getSuggestedContacts: jest.fn(),
});

const reqUser: RequestUser = {
  id: 'user-1',
  email: 'u@u.com',
  name: 'User',
  role: UserRole.USER,
};
const authReq = { user: reqUser } as never;

describe('ContactsController', () => {
  let controller: ContactsController;
  let service: ReturnType<typeof mockService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ContactsController],
      providers: [{ provide: ProfilesService, useFactory: mockService }],
    }).compile();

    controller = module.get(ContactsController);
    service = module.get(ProfilesService);
  });

  describe('addContact', () => {
    it('delegates userId from JWT and stringId param to service', async () => {
      const profile = { id: 'p-2', stringId: 'ABC123' } as Profile;
      service.addContact.mockResolvedValue(profile);

      const result = await controller.addContact('ABC123', authReq);

      expect(service.addContact).toHaveBeenCalledWith('user-1', 'ABC123');
      expect(result).toBe(profile);
    });
  });

  describe('getContacts', () => {
    it('returns contacts for the authenticated user', async () => {
      const contacts = [{ id: 'p-2' }, { id: 'p-3' }] as Profile[];
      service.getContacts.mockResolvedValue(contacts);

      const result = await controller.getContacts(authReq);

      expect(service.getContacts).toHaveBeenCalledWith('user-1');
      expect(result).toBe(contacts);
    });
  });

  describe('getSuggestedContacts', () => {
    it('returns suggested contacts for the authenticated user', async () => {
      const suggestions = [{ id: 'p-4' }] as Profile[];
      service.getSuggestedContacts.mockResolvedValue(suggestions);

      const result = await controller.getSuggestedContacts(authReq);

      expect(service.getSuggestedContacts).toHaveBeenCalledWith('user-1');
      expect(result).toBe(suggestions);
    });
  });
});
