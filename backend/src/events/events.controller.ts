import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { EventsService } from './events.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { AuthUser } from '../common/decorators/current-user.decorator';
import { CreateEventDto, SplitTeamsDto, UpdateEventDto, CreateCommentDto } from './dto/events.dto';
import { Delete } from '@nestjs/common';

@Controller()
export class EventsController {
  constructor(private readonly eventsService: EventsService) {}

  @Get('groups/:groupId/events/latest')
  @UseGuards(JwtAuthGuard)
  getLatestTemplate(
    @Param('groupId') groupId: string,
    @CurrentUser() user: AuthUser,
  ) {
    return this.eventsService.getLatestEventTemplate(groupId, user.id);
  }

  @Get('groups/:groupId/events')
  @UseGuards(JwtAuthGuard)
  listByGroup(
    @Param('groupId') groupId: string,
    @CurrentUser() user: AuthUser,
  ) {
    return this.eventsService.listByGroup(groupId, user.id);
  }

  @Post('groups/:groupId/events')
  @UseGuards(JwtAuthGuard)
  create(
    @Param('groupId') groupId: string,
    @CurrentUser() user: AuthUser,
    @Body() dto: CreateEventDto,
  ) {
    return this.eventsService.create(groupId, user.id, dto);
  }

  @Get('events/:id')
  @UseGuards(JwtAuthGuard)
  getById(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.eventsService.getById(id, user.id);
  }

  @Patch('events/:id')
  @UseGuards(JwtAuthGuard)
  update(
    @Param('id') id: string,
    @CurrentUser() user: AuthUser,
    @Body() dto: UpdateEventDto,
  ) {
    return this.eventsService.update(id, user.id, dto);
  }

  @Post('events/:id/cancel')
  @UseGuards(JwtAuthGuard)
  cancel(
    @Param('id') id: string,
    @CurrentUser() user: AuthUser,
    @Body() dto: { reason?: string },
  ) {
    return this.eventsService.cancel(id, user.id, dto?.reason);
  }

  @Get('events/:id/teams')
  @UseGuards(JwtAuthGuard)
  getTeams(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.eventsService.getTeams(id, user.id);
  }

  @Post('events/:id/teams/split')
  @UseGuards(JwtAuthGuard)
  splitTeams(
    @Param('id') id: string,
    @CurrentUser() user: AuthUser,
    @Body() dto: SplitTeamsDto,
  ) {
    return this.eventsService.splitTeams(id, user.id, dto);
  }

  @Get('events/:id/comments')
  @UseGuards(JwtAuthGuard)
  getComments(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.eventsService.getComments(id, user.id);
  }

  @Post('events/:id/comments')
  @UseGuards(JwtAuthGuard)
  addComment(
    @Param('id') id: string,
    @CurrentUser() user: AuthUser,
    @Body() dto: CreateCommentDto,
  ) {
    return this.eventsService.addComment(id, user.id, dto.content);
  }

  @Delete('events/:id/comments/:commentId')
  @UseGuards(JwtAuthGuard)
  deleteComment(
    @Param('id') id: string,
    @Param('commentId') commentId: string,
    @CurrentUser() user: AuthUser,
  ) {
    return this.eventsService.deleteComment(id, commentId, user.id);
  }

  @Delete('events/:id')
  @UseGuards(JwtAuthGuard)
  delete(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.eventsService.delete(id, user.id);
  }
}
