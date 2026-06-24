import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { VotesService } from './votes.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { AuthUser } from '../common/decorators/current-user.decorator';
import { CastVoteDto } from './dto/votes.dto';

@Controller('events/:eventId/votes')
export class VotesController {
  constructor(private readonly votesService: VotesService) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  castVote(
    @Param('eventId') eventId: string,
    @CurrentUser() user: AuthUser,
    @Body() dto: CastVoteDto,
  ) {
    return this.votesService.castVote(eventId, user.id, dto);
  }

  @Get()
  @UseGuards(JwtAuthGuard)
  getResults(
    @Param('eventId') eventId: string,
    @CurrentUser() user: AuthUser,
  ) {
    return this.votesService.getResults(eventId, user.id);
  }
}
