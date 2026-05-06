import { Test, TestingModule } from '@nestjs/testing';
import { UserRole } from '../users/entities/user.entity';
import { Profile } from './entities/profile.entity';
import { ProfilesController } from './profiles.controller';
import { ProfilesService, RequestUser } from './profiles.service';

const mockService = () => ({
  create: jest.fn(),
  findAll: jest.fn(),
  findOne: jest.fn(),
  findByAlias: jest.fn(),
  update: jest.fn(),
  remove: jest.fn(),
});

const reqUser: RequestUser = { id: 'user-1', email: 'u@u.com', name: 'User', role: UserRole.USER };
const authReq = { user: reqUser } as never;

describe('ProfilesController', () => {
  let controller: ProfilesController;
  let service: ReturnType<typeof mockService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ProfilesController],
      providers: [{ provide: ProfilesService, useFactory: mockService }],
    }).compile();

    controller = module.get(ProfilesController);
    service = module.get(ProfilesService);
  });

  it('create — delegates with userId from JWT', async () => {
    const profile = { id: 'p-1' } as Profile;
    service.create.mockResolvedValue(profile);

    const result = await controller.create(authReq, { alias: 'myalias' });

    expect(service.create).toHaveBeenCalledWith('user-1', { alias: 'myalias' });
    expect(result).toBe(profile);
  });

  it('findAll — returns all profiles', async () => {
    const profiles = [{ id: 'p-1' }, { id: 'p-2' }] as Profile[];
    service.findAll.mockResolvedValue(profiles);

    const result = await controller.findAll();

    expect(service.findAll).toHaveBeenCalled();
    expect(result).toBe(profiles);
  });

  it('findOne — delegates with id param', async () => {
    const profile = { id: 'p-1' } as Profile;
    service.findOne.mockResolvedValue(profile);

    const result = await controller.findOne('p-1');

    expect(service.findOne).toHaveBeenCalledWith('p-1');
    expect(result).toBe(profile);
  });

  it('findByAlias — delegates with alias param', async () => {
    const profile = { id: 'p-1', alias: 'myalias' } as Profile;
    service.findByAlias.mockResolvedValue(profile);

    const result = await controller.findByAlias('myalias');

    expect(service.findByAlias).toHaveBeenCalledWith('myalias');
    expect(result).toBe(profile);
  });

  it('update — delegates with id, dto and requester', async () => {
    const profile = { id: 'p-1', alias: 'updated' } as Profile;
    service.update.mockResolvedValue(profile);

    const result = await controller.update('p-1', { alias: 'updated' }, authReq);

    expect(service.update).toHaveBeenCalledWith('p-1', { alias: 'updated' }, reqUser);
    expect(result).toBe(profile);
  });

  it('remove — delegates with id and requester', async () => {
    service.remove.mockResolvedValue(undefined);

    await controller.remove('p-1', authReq);

    expect(service.remove).toHaveBeenCalledWith('p-1', reqUser);
  });
});
