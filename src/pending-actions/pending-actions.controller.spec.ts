import { Test, TestingModule } from '@nestjs/testing';
import { PendingActionsController } from './pending-actions.controller';
import { PendingActionsService } from './pending-actions.service';

describe('PendingActionsController', () => {
  let controller: PendingActionsController;
  let service: { getPendingActions: jest.Mock };

  const req = { user: { id: 'user-1' } } as never;

  beforeEach(async () => {
    service = {
      getPendingActions: jest.fn().mockResolvedValue({ total: 0 }),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [PendingActionsController],
      providers: [{ provide: PendingActionsService, useValue: service }],
    }).compile();

    controller = module.get<PendingActionsController>(PendingActionsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('delegates to the service with the authenticated user id', async () => {
    await controller.findPending(req);
    expect(service.getPendingActions).toHaveBeenCalledWith('user-1');
  });
});
