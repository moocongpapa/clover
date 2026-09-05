import { Module } from '@nestjs/common';
import { FeedbackController } from './feedback.controller';
import { FeedbackService } from './feedback.service';
import { AuthModule } from '../auth/auth.module';
import { PrismaModule } from '../prisma/prisma.module';
import { AdminGuard } from '../common/guards/admin.guard';

@Module({
  imports: [AuthModule, PrismaModule],
  controllers: [FeedbackController],
  providers: [FeedbackService, AdminGuard],
})
export class FeedbackModule {}
