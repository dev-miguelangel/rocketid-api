import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { CreateTeamDto } from './dto/create-team.dto';
import { UpdateTeamDto } from './dto/update-team.dto';
import { Team } from './entities/team.entity';
import { TeamMember, MemberStatus } from './entities/team-member.entity';
import { TeamRole } from './enums/team-role.enum';
import { SportsService } from '../sports/sports.service';
import { UsersService } from '../users/users.service';

@Injectable()
export class TeamsService {
  constructor(
    @InjectRepository(Team)
    private readonly teamRepository: Repository<Team>,
    @InjectRepository(TeamMember)
    private readonly memberRepository: Repository<TeamMember>,
    private readonly sportsService: SportsService,
    private readonly usersService: UsersService,
  ) {}

  async create(userId: string, dto: CreateTeamDto): Promise<Team> {
    await this.sportsService.findOne(dto.sportId);

    const team = this.teamRepository.create({
      name: dto.name,
      description: dto.description,
      icon: dto.icon,
      color: dto.color,
      gender: dto.gender,
      sportId: dto.sportId,
      ownerId: userId,
    });

    const savedTeam = await this.teamRepository.save(team);

    const ownerMember = this.memberRepository.create({
      teamId: savedTeam.id,
      userId: userId,
      role: TeamRole.OWNER,
      status: MemberStatus.ACTIVE,
    });
    await this.memberRepository.save(ownerMember);

    return this.findById(savedTeam.id);
  }

  async findAll(userId: string): Promise<Team[]> {
    const members = await this.memberRepository.find({
      where: { userId, status: MemberStatus.ACTIVE },
      relations: ['team'],
    });

    const teamIds = members.map((m) => m.teamId);

    if (teamIds.length === 0) {
      return [];
    }

    return this.teamRepository.find({
      where: { id: In(teamIds) },
      relations: ['sport', 'owner'],
      order: { createdAt: 'DESC' },
    });
  }

  async findById(id: string): Promise<Team> {
    const team = await this.teamRepository.findOne({
      where: { id },
      relations: ['sport', 'owner', 'owner.profile'],
    });

    if (!team) {
      throw new NotFoundException('Equipo no encontrado');
    }

    return team;
  }

  async update(
    id: string,
    userId: string,
    dto: UpdateTeamDto,
  ): Promise<Team> {
    const team = await this.findById(id);
    await this.checkCanManage(userId, team);

    if (dto.sportId !== undefined) {
      await this.sportsService.findOne(dto.sportId);
    }

    Object.assign(team, dto);
    return this.teamRepository.save(team);
  }

  async remove(id: string, userId: string): Promise<void> {
    const team = await this.findById(id);

    if (team.ownerId !== userId) {
      throw new ForbiddenException('Solo el propietario puede eliminar el equipo');
    }

    await this.teamRepository.remove(team);
  }

  async getMembers(teamId: string): Promise<TeamMember[]> {
    return this.memberRepository.find({
      where: { teamId },
      relations: ['user', 'user.profile'],
      order: { role: 'ASC', createdAt: 'ASC' },
    });
  }

  async addMember(
    teamId: string,
    requesterId: string,
    memberUserId: string,
    role: TeamRole = TeamRole.MEMBER,
  ): Promise<TeamMember> {
    const team = await this.findById(teamId);
    await this.checkCanManage(requesterId, team);

    const existingMember = await this.memberRepository.findOne({
      where: { teamId, userId: memberUserId },
    });

    if (existingMember) {
      if (existingMember.status === MemberStatus.ACTIVE) {
        throw new BadRequestException('El usuario ya es miembro del equipo');
      }
      existingMember.status = MemberStatus.ACTIVE;
      existingMember.role = role;
      return this.memberRepository.save(existingMember);
    }

    const member = this.memberRepository.create({
      teamId,
      userId: memberUserId,
      role,
      status: MemberStatus.ACTIVE,
    });

    return this.memberRepository.save(member);
  }

  async removeMember(
    teamId: string,
    requesterId: string,
    memberUserId: string,
  ): Promise<void> {
    const team = await this.findById(teamId);
    await this.checkCanManage(requesterId, team);

    const member = await this.memberRepository.findOne({
      where: { teamId, userId: memberUserId },
    });

    if (!member) {
      throw new NotFoundException('Miembro no encontrado');
    }

    if (member.role === TeamRole.OWNER) {
      throw new BadRequestException('No puedes eliminar al propietario del equipo');
    }

    await this.memberRepository.remove(member);
  }

  async updateMemberRole(
    teamId: string,
    requesterId: string,
    memberUserId: string,
    newRole: TeamRole,
  ): Promise<TeamMember> {
    const team = await this.findById(teamId);
    await this.checkCanManage(requesterId, team);

    const member = await this.memberRepository.findOne({
      where: { teamId, userId: memberUserId },
    });

    if (!member) {
      throw new NotFoundException('Miembro no encontrado');
    }

    if (member.role === TeamRole.OWNER) {
      throw new BadRequestException('No puedes cambiar el rol del propietario');
    }

    member.role = newRole;
    return this.memberRepository.save(member);
  }

  async requestToJoin(teamId: string, userId: string): Promise<TeamMember> {
    const team = await this.findById(teamId);

    const existingMember = await this.memberRepository.findOne({
      where: { teamId, userId },
    });

    if (existingMember) {
      if (existingMember.status === MemberStatus.ACTIVE) {
        throw new BadRequestException('Ya eres miembro de este equipo');
      }
      if (existingMember.status === MemberStatus.PENDING) {
        throw new BadRequestException('Ya tienes una solicitud pendiente');
      }
      existingMember.status = MemberStatus.PENDING;
      return this.memberRepository.save(existingMember);
    }

    const member = this.memberRepository.create({
      teamId,
      userId,
      role: TeamRole.MEMBER,
      status: MemberStatus.PENDING,
    });

    return this.memberRepository.save(member);
  }

  async leave(teamId: string, userId: string): Promise<void> {
    const member = await this.memberRepository.findOne({
      where: { teamId, userId },
    });

    if (!member) {
      throw new NotFoundException('No eres miembro de este equipo');
    }

    if (member.role === TeamRole.OWNER) {
      throw new BadRequestException('El propietario no puede abandonar el equipo. Elimínalo si deseas.');
    }

    await this.memberRepository.remove(member);
  }

  async getPendingRequests(teamId: string, userId: string): Promise<TeamMember[]> {
    const team = await this.findById(teamId);
    await this.checkCanManage(userId, team);

    return this.memberRepository.find({
      where: { teamId, status: MemberStatus.PENDING },
      relations: ['user', 'user.profile'],
    });
  }

  async acceptRequest(
    teamId: string,
    requesterId: string,
    memberUserId: string,
  ): Promise<TeamMember> {
    return this.addMember(teamId, requesterId, memberUserId, TeamRole.MEMBER);
  }

  async rejectRequest(
    teamId: string,
    requesterId: string,
    memberUserId: string,
  ): Promise<void> {
    const team = await this.findById(teamId);
    await this.checkCanManage(requesterId, team);

    const member = await this.memberRepository.findOne({
      where: { teamId, userId: memberUserId, status: MemberStatus.PENDING },
    });

    if (!member) {
      throw new NotFoundException('Solicitud no encontrada');
    }

    await this.memberRepository.remove(member);
  }

  async getUserRole(teamId: string, userId: string): Promise<TeamRole | null> {
    const member = await this.memberRepository.findOne({
      where: { teamId, userId, status: MemberStatus.ACTIVE },
    });
    return member?.role ?? null;
  }

  private async checkCanManage(userId: string, team: Team): Promise<void> {
    const member = await this.memberRepository.findOne({
      where: { teamId: team.id, userId, status: MemberStatus.ACTIVE },
    });

    if (!member || (member.role !== TeamRole.OWNER && member.role !== TeamRole.CAPTAIN)) {
      throw new ForbiddenException('No tienes permisos para gestionar este equipo');
    }
  }
}