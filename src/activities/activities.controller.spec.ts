import { Test, TestingModule } from '@nestjs/testing';
import { ActivitiesController } from './activities.controller';
import { ActivitiesService } from './activities.service';
import { CreateActivityDto } from './dto/create-activity.dto';
import { UpdateActivityDto } from './dto/update-activity.dto';
import { ListActivitiesQueryDto } from './dto/list-activities-query.dto';

describe('ActivitiesController', () => {
  let controller: ActivitiesController;
  let service: {
    create: jest.Mock;
    findAll: jest.Mock;
    findMine: jest.Mock;
    findById: jest.Mock;
    update: jest.Mock;
    cancel: jest.Mock;
    remove: jest.Mock;
  };

  const req = { user: { id: 'user-1' } } as never;

  beforeEach(async () => {
    service = {
      create: jest.fn().mockResolvedValue({ id: 'activity-1' }),
      findAll: jest.fn().mockResolvedValue([]),
      findMine: jest.fn().mockResolvedValue([]),
      findById: jest.fn().mockResolvedValue({ id: 'activity-1' }),
      update: jest.fn().mockResolvedValue({ id: 'activity-1' }),
      cancel: jest.fn().mockResolvedValue({ id: 'activity-1' }),
      remove: jest.fn().mockResolvedValue(undefined),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [ActivitiesController],
      providers: [{ provide: ActivitiesService, useValue: service }],
    }).compile();

    controller = module.get<ActivitiesController>(ActivitiesController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('delegates create with the authenticated user id', async () => {
    const dto = {} as CreateActivityDto;
    await controller.create(dto, req);
    expect(service.create).toHaveBeenCalledWith('user-1', dto);
  });

  it('delegates findAll with the query', async () => {
    const query = {} as ListActivitiesQueryDto;
    await controller.findAll(query);
    expect(service.findAll).toHaveBeenCalledWith(query);
  });

  it('delegates findMine with the authenticated user id', async () => {
    await controller.findMine(req);
    expect(service.findMine).toHaveBeenCalledWith('user-1');
  });

  it('delegates findOne with the activity id', async () => {
    await controller.findOne('activity-1');
    expect(service.findById).toHaveBeenCalledWith('activity-1');
  });

  it('delegates update with id, user and dto', async () => {
    const dto = {} as UpdateActivityDto;
    await controller.update('activity-1', dto, req);
    expect(service.update).toHaveBeenCalledWith('activity-1', 'user-1', dto);
  });

  it('delegates cancel with id and user', async () => {
    await controller.cancel('activity-1', req);
    expect(service.cancel).toHaveBeenCalledWith('activity-1', 'user-1');
  });

  it('delegates remove with id and user', async () => {
    await controller.remove('activity-1', req);
    expect(service.remove).toHaveBeenCalledWith('activity-1', 'user-1');
  });
});
