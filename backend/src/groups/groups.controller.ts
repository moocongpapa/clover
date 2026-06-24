import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { GroupsService } from './groups.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { OptionalJwtAuthGuard } from '../common/guards/optional-jwt-auth.guard';
import {
  CurrentUser,
  OptionalUser,
} from '../common/decorators/current-user.decorator';
import type { AuthUser } from '../common/decorators/current-user.decorator';
import {
  CreateGroupDto,
  TransferPresidentDto,
  UpdateMemberDto,
} from './dto/groups.dto';

@Controller('groups')
export class GroupsController {
  constructor(private readonly groupsService: GroupsService) {}

  @Get()
  @UseGuards(OptionalJwtAuthGuard)
  listPublic(
    @OptionalUser() user: AuthUser | null,
    @Query('search') search?: string,
    @Query('category') category?: string,
  ) {
    return this.groupsService.listPublic(search, category, user?.id);
  }

  @Get('mine')
  @UseGuards(JwtAuthGuard)
  myGroups(@CurrentUser() user: AuthUser) {
    return this.groupsService.myGroups(user.id);
  }

  @Post()
  @UseGuards(JwtAuthGuard)
  create(@CurrentUser() user: AuthUser, @Body() dto: CreateGroupDto) {
    return this.groupsService.create(user.id, dto);
  }

  @Get('join/:inviteCode')
  @UseGuards(JwtAuthGuard)
  joinByInvite(
    @Param('inviteCode') inviteCode: string,
    @CurrentUser() user: AuthUser,
  ) {
    return this.groupsService.joinByInviteCode(inviteCode, user.id);
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  getById(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.groupsService.getById(id, user.id);
  }

  @Post(':id/join')
  @UseGuards(JwtAuthGuard)
  join(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.groupsService.joinByGroupId(id, user.id);
  }

  @Post(':id/join/cancel')
  @UseGuards(JwtAuthGuard)
  cancelJoin(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.groupsService.cancelJoinRequest(id, user.id);
  }

  @Post(':id/leave')
  @UseGuards(JwtAuthGuard)
  leave(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.groupsService.leave(id, user.id);
  }

  @Patch(':id/members/:userId')
  @UseGuards(JwtAuthGuard)
  updateMember(
    @Param('id') groupId: string,
    @Param('userId') targetUserId: string,
    @CurrentUser() user: AuthUser,
    @Body() dto: UpdateMemberDto,
  ) {
    return this.groupsService.updateMember(
      groupId,
      targetUserId,
      user.id,
      dto,
    );
  }

  @Post(':id/transfer-president')
  @UseGuards(JwtAuthGuard)
  transferPresident(
    @Param('id') groupId: string,
    @CurrentUser() user: AuthUser,
    @Body() dto: TransferPresidentDto,
  ) {
    return this.groupsService.transferPresident(groupId, user.id, dto);
  }
}
