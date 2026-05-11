import { Injectable, ForbiddenException } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { UserRole } from '../../users/entities/user.entity';

@Injectable()
export class AdminGuard extends AuthGuard('jwt') {
  override handleRequest<TUser = any>(err: any, user: any): TUser {
    if (err || !user || user.role !== UserRole.ADMIN) {
      throw new ForbiddenException('Acceso restringido a administradores');
    }
    return user;
  }
}
