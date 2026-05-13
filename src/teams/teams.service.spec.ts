import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TeamsService } from './teams.service';
import { Team } from './entities/team.entity';
import { TeamMember, MemberStatus } from './entities/team-member.entity';
import { TeamGender } from './enums/team-gender.enum';
import { TeamRole } from './enums/team-role.enum';
import { SportsService } from '../sports/sports.service';
import { UsersService } from '../users/users.service';
import { NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';

const mockTeam: Team = {
  id: 'team-uuid-1',
  name: 'Test Team',
  description: 'A test team',
  icon: 'sports_soccer',
  color: '#E53935',
  gender: TeamGender.MIXED,
  sportId: 1,
  sport: { id: 1, name: 'football', label: 'Fútbol', icon: 'sports_soccer', color: '#E53935', status: true, createdAt: new Date(), updatedAt: new Date() },
  ownerId: 'user-uuid-1',
  owner: { id: 'user-uuid-1', googleId: 'google-1', email: 'owner@test.com', name: 'Owner User', avatar: null, role: 'user' as any, status: 'active' as any, onboardingStep: 0, refreshTokenHash: null, createdAt: new Date(), updatedAt: new Date(), profile: undefined },
  members: [],
  createdAt: new Date(),
  updatedAt: new Date(),
};

const mockMember: TeamMember = {
  id: 'member-uuid-1',
  teamId: 'team-uuid-1',
  team: mockTeam,
  userId: 'user-uuid-2',
  user: { id: 'user-uuid-2', googleId: 'google-2', email: 'member@test.com', name: 'Member User', avatar: null, role: 'user' as any, status: 'active' as any, onboardingStep: 0, refreshTokenHash: null, createdAt: new Date(), updatedAt: new Date(), profile: undefined },
  role: TeamRole.MEMBER,
  status: MemberStatus.ACTIVE,
  createdAt: new Date(),
  updatedAt: new Date(),
};

describe('TeamsService', () => {
  let service: TeamsService;
  let teamRepo: jest.Mocked<Repository<Team>>;
  let memberRepo: jest.Mocked<Repository<TeamMember>>;
  let sportsService: jest.Mocked<SportsService>;
  let usersService: jest.Mocked<UsersService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TeamsService,
        {
          provide: getRepositoryToken(Team),
          useValue: {
            create: jest.fn(),
            save: jest.fn(),
            findOne: jest.fn(),
            findOneBy: jest.fn(),
            find: jest.fn(),
            remove: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(TeamMember),
          useValue: {
            create: jest.fn(),
            save: jest.fn(),
            find: jest.fn(),
            findOne: jest.fn(),
            remove: jest.fn(),
          },
        },
        {
          provide: SportsService,
          useValue: {
            findOne: jest.fn(),
          },
        },
        {
          provide: UsersService,
          useValue: {
            findById: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<TeamsService>(TeamsService);
    teamRepo = module.get(getRepositoryToken(Team));
    memberRepo = module.get(getRepositoryToken(TeamMember));
    sportsService = module.get(SportsService);
    usersService = module.get(UsersService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should create a team and add owner as member', async () => {
      sportsService.findOne.mockResolvedValue({ id: 1, name: 'football', label: 'Fútbol', icon: 'sports_soccer', color: '#E53935', status: true, createdAt: new Date(), updatedAt: new Date() });
      teamRepo.create.mockImplementation((data: any) => ({ ...data, id: 'team-uuid-1' }));
      teamRepo.save.mockImplementation((data: any) => Promise.resolve({ ...mockTeam, ...data }));
      teamRepo.findOne.mockResolvedValue(mockTeam);
      memberRepo.create.mockImplementation((data: any) => ({ ...data, id: 'member-uuid-1' }));
      memberRepo.save.mockImplementation((data: any) => Promise.resolve({ ...mockMember, ...data }));

      const result = await service.create('user-uuid-1', {
        name: 'Test Team',
        description: 'A test team',
        icon: 'sports_soccer',
        color: '#E53935',
        gender: TeamGender.MIXED,
        sportId: 1,
      });

      expect(result.name).toBe('Test Team');
      expect(result.ownerId).toBe('user-uuid-1');
      expect(teamRepo.save).toHaveBeenCalledTimes(1);
      expect(memberRepo.save).toHaveBeenCalled();
    });
  });

  describe('findAll', () => {
    it('should return teams where user is active member', async () => {
      memberRepo.find.mockResolvedValue([{ id: 'm1', teamId: 'team-uuid-1', userId: 'user-uuid-1', team: mockTeam, user: mockTeam.owner, role: TeamRole.MEMBER, status: MemberStatus.ACTIVE, createdAt: new Date(), updatedAt: new Date() }]);
      teamRepo.find.mockResolvedValue([mockTeam]);

      const result = await service.findAll('user-uuid-1');

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('team-uuid-1');
    });

    it('should return empty array when user has no teams', async () => {
      memberRepo.find.mockResolvedValue([]);

      const result = await service.findAll('user-uuid-1');

      expect(result).toHaveLength(0);
    });
  });

  describe('findById', () => {
    it('should return team when found', async () => {
      teamRepo.findOne.mockResolvedValue(mockTeam);

      const result = await service.findById('team-uuid-1');

      expect(result).toEqual(mockTeam);
    });

    it('should throw NotFoundException when not found', async () => {
      teamRepo.findOne.mockResolvedValue(null);

      await expect(service.findById('non-existent')).rejects.toThrow(NotFoundException);
    });
  });

  describe('remove', () => {
    it('should remove team when user is owner', async () => {
      teamRepo.findOne.mockResolvedValue(mockTeam);
      teamRepo.remove.mockResolvedValue(mockTeam);

      await service.remove('team-uuid-1', 'user-uuid-1');

      expect(teamRepo.remove).toHaveBeenCalledWith(mockTeam);
    });

    it('should throw ForbiddenException when user is not owner', async () => {
      teamRepo.findOne.mockResolvedValue(mockTeam);

      await expect(service.remove('team-uuid-1', 'other-user')).rejects.toThrow(ForbiddenException);
    });
  });

  describe('requestToJoin', () => {
    it('should create pending request when user is not member', async () => {
      teamRepo.findOne.mockResolvedValue(mockTeam);
      memberRepo.findOne.mockResolvedValue(null);
      memberRepo.create.mockImplementation((data: any) => ({ ...data, id: 'member-uuid-1' }));
      memberRepo.save.mockImplementation((data: any) => Promise.resolve({ ...mockMember, ...data, status: MemberStatus.PENDING }));

      const result = await service.requestToJoin('team-uuid-1', 'new-user-uuid');

      expect(result.status).toBe(MemberStatus.PENDING);
    });

    it('should throw BadRequestException when user is already member', async () => {
      teamRepo.findOne.mockResolvedValue(mockTeam);
      memberRepo.findOne.mockResolvedValue({ ...mockMember, status: MemberStatus.ACTIVE });

      await expect(service.requestToJoin('team-uuid-1', 'user-uuid-2')).rejects.toThrow(BadRequestException);
    });
  });

  describe('leave', () => {
    it('should remove member when leaving', async () => {
      memberRepo.findOne.mockResolvedValue({ ...mockMember, role: TeamRole.MEMBER });

      await service.leave('team-uuid-1', 'user-uuid-2');

      expect(memberRepo.remove).toHaveBeenCalled();
    });

    it('should throw BadRequestException when owner tries to leave', async () => {
      memberRepo.findOne.mockResolvedValue({ ...mockMember, role: TeamRole.OWNER });

      await expect(service.leave('team-uuid-1', 'user-uuid-1')).rejects.toThrow(BadRequestException);
    });
  });

  describe('updateMemberRole', () => {
    it('should promote member to captain', async () => {
      teamRepo.findOne.mockResolvedValue(mockTeam);
      memberRepo.findOne
        .mockResolvedValueOnce({ ...mockMember, role: TeamRole.OWNER }) // checkCanManage
        .mockResolvedValueOnce({ ...mockMember, role: TeamRole.MEMBER }); // get member to update
      memberRepo.save.mockImplementation((data: any) => Promise.resolve({ ...data }));

      await service.updateMemberRole('team-uuid-1', 'user-uuid-1', 'user-uuid-2', TeamRole.CAPTAIN);

      expect(memberRepo.save).toHaveBeenCalledWith(expect.objectContaining({ role: TeamRole.CAPTAIN }));
    });

    it('should not allow changing owner role', async () => {
      teamRepo.findOne.mockResolvedValue(mockTeam);
      memberRepo.findOne
        .mockResolvedValueOnce({ ...mockMember, role: TeamRole.OWNER }) // checkCanManage
        .mockResolvedValueOnce({ ...mockMember, role: TeamRole.OWNER }); // get member to update

      await expect(
        service.updateMemberRole('team-uuid-1', 'user-uuid-1', 'user-uuid-2', TeamRole.CAPTAIN),
      ).rejects.toThrow(BadRequestException);
    });
  });
});