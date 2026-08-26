import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class AdminGuard implements CanActivate {
  constructor(
    private readonly jwtService: JwtService,
    private readonly prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    let user = request.user;

    if (!user) {
      const authHeader = request.headers.authorization as string | undefined;
      if (!authHeader?.startsWith('Bearer ')) {
        throw new UnauthorizedException('관리자 로그인이 필요합니다.');
      }

      const token = authHeader.slice(7);
      try {
        const payload = this.jwtService.verify<{ sub: string }>(token);
        user = await this.prisma.user.findUnique({
          where: { id: payload.sub },
        });
      } catch {
        throw new UnauthorizedException('유효하지 않은 토큰입니다.');
      }
    }

    if (!user) {
      throw new UnauthorizedException('유효하지 않은 사용자입니다.');
    }

    if (user.isBlocked) {
      throw new UnauthorizedException('이용이 정지된 계정입니다.');
    }

    if (user.role !== 'ADMIN') {
      throw new ForbiddenException('관리자 권한이 필요합니다.');
    }

    request.user = user;
    return true;
  }
}
