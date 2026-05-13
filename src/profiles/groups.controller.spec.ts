import { Test, TestingModule } from '@nestjs/testing';
import { UserRole } from '../users/entities/user.entity';
import { ContactGroup } from './entities/contact-group.entity';
import { GroupsController } from './groups.controller';
import { GroupsService, RequestUser } from './groups.service';

const mockService = () => ({
  create: jest.fn(),
  findAll: jest.fn(),
  findOne: jest.fn(),
  update: jest.fn(),
  remove: jest.fn(),
  addContacts: jest.fn(),
  removeContacts: jest.fn(),
});

const reqUser: RequestUser = {
  id: 'user-1',
  email: 'u@u.com',
  name: 'User',
  role: UserRole.USER,
};
const authReq = { user: reqUser } as never;

describe('GroupsController', () => {
  let controller: GroupsController;
  let service: ReturnType<typeof mockService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [GroupsController],
      providers: [{ provide: GroupsService, useFactory: mockService }],
    }).compile();

    controller = module.get<GroupsController>(GroupsController);
    service = module.get(GroupsService);
  });

  describe('create', () => {
    it('delegates to service with userId and dto', async () => {
      const group = { id: 'g-1', name: 'testgroup' } as ContactGroup;
      service.create.mockResolvedValue(group);

      const result = await controller.create({ name: 'testgroup' }, authReq);

      expect(service.create).toHaveBeenCalledWith('user-1', {
        name: 'testgroup',
      });
      expect(result).toBe(group);
    });
  });

  describe('findAll', () => {
    it('delegates to service with userId', async () => {
      const groups = [{ id: 'g-1' }, { id: 'g-2' }] as ContactGroup[];
      service.findAll.mockResolvedValue(groups);

      const result = await controller.findAll(authReq);

      expect(service.findAll).toHaveBeenCalledWith('user-1');
      expect(result).toBe(groups);
    });
  });

  describe('findOne', () => {
    it('delegates to service with userId and groupId', async () => {
      const group = { id: 'g-1', name: 'testgroup' } as ContactGroup;
      service.findOne.mockResolvedValue(group);

      const result = await controller.findOne('g-1', authReq);

      expect(service.findOne).toHaveBeenCalledWith('user-1', 'g-1');
      expect(result).toBe(group);
    });
  });

  describe('update', () => {
    it('delegates to service with userId, groupId and dto', async () => {
      const group = { id: 'g-1', name: 'updated' } as ContactGroup;
      service.update.mockResolvedValue(group);

      const result = await controller.update(
        'g-1',
        { name: 'updated' },
        authReq,
      );

      expect(service.update).toHaveBeenCalledWith('user-1', 'g-1', {
        name: 'updated',
      });
      expect(result).toBe(group);
    });
  });

  describe('remove', () => {
    it('delegates to service with userId and groupId', async () => {
      service.remove.mockResolvedValue(undefined);

      await controller.remove('g-1', authReq);

      expect(service.remove).toHaveBeenCalledWith('user-1', 'g-1');
    });
  });

  describe('addContacts', () => {
    it('delegates to service with userId, groupId and contactIds', async () => {
      const group = { id: 'g-1', contacts: [] } as ContactGroup;
      service.addContacts.mockResolvedValue(group);

      const result = await controller.addContacts(
        'g-1',
        { contactIds: ['p-2'] },
        authReq,
      );

      expect(service.addContacts).toHaveBeenCalledWith('user-1', 'g-1', [
        'p-2',
      ]);
      expect(result).toBe(group);
    });
  });

  describe('removeContacts', () => {
    it('delegates to service with userId, groupId and contactIds', async () => {
      const group = { id: 'g-1', contacts: [] } as ContactGroup;
      service.removeContacts.mockResolvedValue(group);

      const result = await controller.removeContacts(
        'g-1',
        { contactIds: ['p-2'] },
        authReq,
      );

      expect(service.removeContacts).toHaveBeenCalledWith('user-1', 'g-1', [
        'p-2',
      ]);
      expect(result).toBe(group);
    });
  });
});
