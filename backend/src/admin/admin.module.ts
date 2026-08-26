import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { AdminController, PublicAdminDataController } from './admin.controller';
import { AdminService } from './admin.service';
import { AdminGuard } from '../common/guards/admin.guard';
import { PrismaModule } from '../prisma/prisma.module';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [PrismaModule, JwtModule, AuthModule],
  controllers: [AdminController, PublicAdminDataController],
  providers: [AdminService, AdminGuard],
  exports: [AdminService],
})
export class AdminModule {}
