import {
  BadRequestException,
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
  UpdateGroupDto,
  UpdateMemberDto,
  UpdateMyStatusDto,
  CreateGroupMediaDto,
  LinkProfileCardDto,
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

  @Get('my-dues/summary')
  @UseGuards(JwtAuthGuard)
  getMyDuesSummary(@CurrentUser() user: AuthUser) {
    return this.groupsService.getMyDuesSummary(user.id);
  }

  @Get('roles')
  getRoles() {
    return this.groupsService.getRoles();
  }

  @Post()
  @UseGuards(JwtAuthGuard)
  create(@CurrentUser() user: AuthUser, @Body() dto: CreateGroupDto) {
    return this.groupsService.create(user.id, dto);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard)
  update(
    @Param('id') id: string,
    @CurrentUser() user: AuthUser,
    @Body() dto: UpdateGroupDto,
  ) {
    return this.groupsService.update(id, user.id, dto);
  }

  @Get('preview/:inviteCode')
  @UseGuards(OptionalJwtAuthGuard)
  getPreviewByInviteCode(
    @Param('inviteCode') inviteCode: string,
    @OptionalUser() user: AuthUser | null,
  ) {
    return this.groupsService.getGroupByInviteCode(inviteCode, user?.id);
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

  @Patch(':id/members/my-status')
  @UseGuards(JwtAuthGuard)
  updateMyStatus(
    @Param('id') id: string,
    @CurrentUser() user: AuthUser,
    @Body() dto: UpdateMyStatusDto,
  ) {
    return this.groupsService.updateMyStatus(id, user.id, dto);
  }

  @Post(':id/members/link-profile')
  @UseGuards(JwtAuthGuard)
  linkProfile(
    @Param('id') id: string,
    @CurrentUser() user: AuthUser,
    @Body() dto: LinkProfileCardDto,
  ) {
    return this.groupsService.linkProfileCard(
      id,
      user.id,
      dto.profileCardId ?? null,
    );
  }

  @Patch(':id/members/:userId')
  @UseGuards(JwtAuthGuard)
  updateMember(
    @Param('id') groupId: string,
    @Param('userId') targetUserId: string,
    @CurrentUser() user: AuthUser,
    @Body() dto: UpdateMemberDto,
  ) {
    return this.groupsService.updateMember(groupId, targetUserId, user.id, dto);
  }

  @Get(':id/payments')
  @UseGuards(JwtAuthGuard)
  getPayments(
    @Param('id') id: string,
    @CurrentUser() user: AuthUser,
    @Query('year') yearStr: string,
    @Query('month') monthStr: string,
  ) {
    const { year, month } = parseDuesPeriod(yearStr, monthStr);
    return this.groupsService.getPayments(id, user.id, year, month);
  }

  @Post(':id/payments/:userId/toggle')
  @UseGuards(JwtAuthGuard)
  togglePayment(
    @Param('id') id: string,
    @Param('userId') targetUserId: string,
    @CurrentUser() user: AuthUser,
    @Query('year') yearStr: string,
    @Query('month') monthStr: string,
  ) {
    const { year, month } = parseDuesPeriod(yearStr, monthStr);
    return this.groupsService.togglePayment(
      id,
      user.id,
      targetUserId,
      year,
      month,
    );
  }

  @Post(':id/payments/remind')
  @UseGuards(JwtAuthGuard)
  remindUnpaidMembers(
    @Param('id') id: string,
    @CurrentUser() user: AuthUser,
    @Query('year') yearStr: string,
    @Query('month') monthStr: string,
  ) {
    const { year, month } = parseDuesPeriod(yearStr, monthStr);
    return this.groupsService.remindUnpaidMembers(id, user.id, year, month);
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

  @Get(':id/media')
  @UseGuards(JwtAuthGuard)
  getGroupMedia(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.groupsService.getGroupMedia(id, user.id);
  }

  @Post(':id/media')
  @UseGuards(JwtAuthGuard)
  createGroupMedia(
    @Param('id') id: string,
    @CurrentUser() user: AuthUser,
    @Body() dto: CreateGroupMediaDto,
  ) {
    return this.groupsService.createGroupMedia(id, user.id, dto);
  }

  @Delete(':id/media/:mediaId')
  @UseGuards(JwtAuthGuard)
  deleteGroupMedia(
    @Param('id') groupId: string,
    @Param('mediaId') mediaId: string,
    @CurrentUser() user: AuthUser,
  ) {
    return this.groupsService.deleteGroupMedia(groupId, mediaId, user.id);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  deleteGroup(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.groupsService.deleteGroup(id, user.id);
  }

  @Delete(':id/members/:userId')
  @UseGuards(JwtAuthGuard)
  kickMember(
    @Param('id') id: string,
    @Param('userId') targetUserId: string,
    @CurrentUser() user: AuthUser,
  ) {
    return this.groupsService.kickMember(id, targetUserId, user.id);
  }
}

function parseDuesPeriod(yearValue?: string, monthValue?: string) {
  const year = Number(yearValue);
  const month = Number(monthValue);
  if (
    !Number.isInteger(year) ||
    year < 2000 ||
    year > 2100 ||
    !Number.isInteger(month) ||
    month < 1 ||
    month > 12
  ) {
    throw new BadRequestException(
      'year와 month는 유효한 회비 기간이어야 합니다.',
    );
  }
  return { year, month };
}
