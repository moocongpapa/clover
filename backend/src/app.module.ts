import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
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

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ScheduleModule.forRoot(),
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
  ],
})
export class AppModule {}
