import { Body, Controller, Get, Param, Post, UseGuards, Query } from '@nestjs/common';
import { AnnouncementsService } from './announcements.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { AuthUser } from '../common/decorators/current-user.decorator';
import { CreateAnnouncementDto } from './announcements.dto';

@Controller('announcements')
export class AnnouncementsController {
  constructor(private readonly service: AnnouncementsService) {}

  @Get()
  async list(@Query('groupId') groupId?: string) {
    return this.service.list(groupId);
  }

  @Get(':id')
  async getById(@Param('id') id: string) {
    return this.service.getById(id);
  }

  @Post()
  @UseGuards(JwtAuthGuard)
  async create(
    @CurrentUser() user: AuthUser,
    @Body() dto: CreateAnnouncementDto,
  ) {
    return this.service.create(user.id, dto);
  }
}
