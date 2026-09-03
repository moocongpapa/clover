import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { AnnouncementsService } from './announcements.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { AuthUser } from '../common/decorators/current-user.decorator';
import { CreateAnnouncementDto, UpdateAnnouncementDto } from './announcements.dto';

@Controller('announcements')
export class AnnouncementsController {
  constructor(private readonly service: AnnouncementsService) {}

  @Get('mine')
  @UseGuards(JwtAuthGuard)
  async listMy(@CurrentUser() user: AuthUser) {
    return this.service.listMy(user.id);
  }

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

  @Patch(':id')
  @UseGuards(JwtAuthGuard)
  async update(
    @Param('id') id: string,
    @CurrentUser() user: AuthUser,
    @Body() dto: UpdateAnnouncementDto,
  ) {
    return this.service.update(id, user.id, dto);
  }

  @Patch(':id/pin')
  @UseGuards(JwtAuthGuard)
  async togglePin(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.service.togglePin(id, user.id);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  async delete(
    @Param('id') id: string,
    @CurrentUser() user: AuthUser,
  ) {
    return this.service.delete(id, user.id);
  }
}
