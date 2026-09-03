import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { GroupsModule } from './groups/groups.module';
import { EventsModule } from './events/events.module';
import { VotesModule } from './votes/votes.module';
import { NotificationsModule } from './notifications/notifications.module';
import { CalendarModule } from './calendar/calendar.module';
import { UploadsModule } from './uploads/uploads.module';
import { RegionsModule } from './regions/regions.module';
import { AnnouncementsModule } from './announcements/announcements.module';
import { ChatModule } from './chat/chat.module';
import { FeedbackModule } from './feedback/feedback.module';
import { AdminModule } from './admin/admin.module';
import { HealthModule } from './health/health.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ScheduleModule.forRoot(),
    ThrottlerModule.forRoot([{ ttl: 60000, limit: 120 }]),
    PrismaModule,
    AuthModule,
    GroupsModule,
    EventsModule,
    VotesModule,
    NotificationsModule,
    CalendarModule,
    UploadsModule,
    RegionsModule,
    AnnouncementsModule,
    ChatModule,
    FeedbackModule,
    AdminModule,
    HealthModule,
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}
