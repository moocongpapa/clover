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
import { AdminService } from './admin.service';
import { AdminGuard } from '../common/guards/admin.guard';
import {
  CreateCategoryDto,
  UpdateCategoryDto,
  ReorderCategoriesDto,
  UpdateUserAdminDto,
  UpdateGroupAdminDto,
  UpdateFeedbackStatusDto,
  CreateSystemAnnouncementDto,
  UpdateSystemAnnouncementDto,
  SetAppSettingDto,
  BroadcastPushDto,
  CreateRoleDto,
  UpdateRoleDto,
  ReorderRolesDto,
} from './admin.dto';

@Controller('admin')
@UseGuards(AdminGuard)
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  // ── Dashboard ──
  @Get('dashboard')
  getDashboardStats() {
    return this.adminService.getDashboardStats();
  }

  // ── Users ──
  @Get('users')
  getUsers(
    @Query('search') search?: string,
    @Query('role') role?: string,
    @Query('isBlocked') isBlocked?: boolean,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.adminService.getUsers({ search, role, isBlocked, page, limit });
  }

  @Get('users/:id')
  getUserDetail(@Param('id') id: string) {
    return this.adminService.getUserDetail(id);
  }

  @Patch('users/:id')
  updateUser(@Param('id') id: string, @Body() dto: UpdateUserAdminDto) {
    return this.adminService.updateUser(id, dto);
  }

  // ── Groups ──
  @Get('groups')
  getGroups(
    @Query('search') search?: string,
    @Query('category') category?: string,
    @Query('isPublic') isPublic?: boolean,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.adminService.getGroups({ search, category, isPublic, page, limit });
  }

  @Patch('groups/:id')
  updateGroup(@Param('id') id: string, @Body() dto: UpdateGroupAdminDto) {
    return this.adminService.updateGroup(id, dto);
  }

  @Delete('groups/:id')
  deleteGroup(@Param('id') id: string) {
    return this.adminService.deleteGroup(id);
  }

  // ── Categories ──
  @Get('categories')
  getCategories() {
    return this.adminService.getCategories(true);
  }

  @Post('categories')
  createCategory(@Body() dto: CreateCategoryDto) {
    return this.adminService.createCategory(dto);
  }

  @Patch('categories/reorder')
  reorderCategories(@Body() dto: ReorderCategoriesDto) {
    return this.adminService.reorderCategories(dto.categoryIds);
  }

  @Patch('categories/:id')
  updateCategory(@Param('id') id: string, @Body() dto: UpdateCategoryDto) {
    return this.adminService.updateCategory(id, dto);
  }

  @Delete('categories/:id')
  deleteCategory(@Param('id') id: string) {
    return this.adminService.deleteCategory(id);
  }

  // ── Feedback ──
  @Get('feedback')
  getFeedbacks(
    @Query('status') status?: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.adminService.getFeedbacks({ status, page, limit });
  }

  @Patch('feedback/:id/status')
  updateFeedbackStatus(
    @Param('id') id: string,
    @Body() dto: UpdateFeedbackStatusDto,
  ) {
    return this.adminService.updateFeedbackStatus(id, dto);
  }

  @Delete('feedback/:id')
  deleteFeedback(@Param('id') id: string) {
    return this.adminService.deleteFeedback(id);
  }

  // ── System Announcements ──
  @Get('announcements')
  getSystemAnnouncements() {
    return this.adminService.getSystemAnnouncements(true);
  }

  @Post('announcements')
  createSystemAnnouncement(@Body() dto: CreateSystemAnnouncementDto) {
    return this.adminService.createSystemAnnouncement(dto);
  }

  @Patch('announcements/:id')
  updateSystemAnnouncement(
    @Param('id') id: string,
    @Body() dto: UpdateSystemAnnouncementDto,
  ) {
    return this.adminService.updateSystemAnnouncement(id, dto);
  }

  @Delete('announcements/:id')
  deleteSystemAnnouncement(@Param('id') id: string) {
    return this.adminService.deleteSystemAnnouncement(id);
  }

  // ── App Settings ──
  @Get('settings')
  getSettings() {
    return this.adminService.getSettings();
  }

  @Post('settings')
  setSetting(@Body() dto: SetAppSettingDto) {
    return this.adminService.setSetting(dto);
  }

  // ── Role Management ──
  @Get('roles')
  getRoles() {
    return this.adminService.getRoles();
  }

  @Post('roles')
  createRole(@Body() dto: CreateRoleDto) {
    return this.adminService.createRole(dto);
  }

  @Patch('roles/:key')
  updateRole(@Param('key') key: string, @Body() dto: UpdateRoleDto) {
    return this.adminService.updateRole(key, dto);
  }

  @Delete('roles/:key')
  deleteRole(@Param('key') key: string) {
    return this.adminService.deleteRole(key);
  }

  @Post('roles/reorder')
  reorderRoles(@Body() dto: ReorderRolesDto) {
    return this.adminService.reorderRoles(dto.keys);
  }

  // ── Broadcast Notification ──
  @Post('broadcast')
  broadcastNotification(@Body() dto: BroadcastPushDto) {
    return this.adminService.broadcastNotification(dto);
  }
}

// ═══════════════════════════════════════════════════════════
// Public Endpoints for App Users (Dynamic Categories & Banners)
// ═══════════════════════════════════════════════════════════
@Controller('public')
export class PublicAdminDataController {
  constructor(private readonly adminService: AdminService) {}

  @Get('categories')
  getActiveCategories() {
    return this.adminService.getCategories(false);
  }

  @Get('system-announcements')
  getActiveSystemAnnouncements() {
    return this.adminService.getSystemAnnouncements(false);
  }

  @Get('settings')
  getPublicSettings() {
    return this.adminService.getSettings();
  }

  @Get('roles')
  getRoles() {
    return this.adminService.getRoles();
  }
}
