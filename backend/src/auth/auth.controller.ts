import {
  Body,
  Controller,
  Get,
  Patch,
  Post,
  Delete,
  UseGuards,
  Param,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import {
  DevLoginDto,
  KakaoCallbackDto,
  UpdateProfileDto,
  CreateProfileCardDto,
  UpdateProfileCardDto,
  UpdateFcmTokenDto,
} from './dto/auth.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { AuthUser } from '../common/decorators/current-user.decorator';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Get('kakao/url')
  getKakaoUrl() {
    return { url: this.authService.getKakaoLoginUrl() };
  }

  @Post('kakao/callback')
  kakaoCallback(@Body() dto: KakaoCallbackDto) {
    return this.authService.kakaoCallback(dto.code);
  }

  @Post('dev-login')
  devLogin(@Body() dto: DevLoginDto) {
    return this.authService.devLogin(dto);
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  getMe(@CurrentUser() user: AuthUser) {
    return this.authService.getMe(user.id);
  }

  @Patch('me')
  @UseGuards(JwtAuthGuard)
  updateMe(@CurrentUser() user: AuthUser, @Body() dto: UpdateProfileDto) {
    return this.authService.updateProfile(user.id, dto);
  }

  @Patch('me/fcm-token')
  @UseGuards(JwtAuthGuard)
  updateFcmToken(
    @CurrentUser() user: AuthUser,
    @Body() dto: UpdateFcmTokenDto,
  ) {
    return this.authService.updateFcmToken(user.id, dto.fcmToken);
  }

  @Get('me/profile-cards')
  @UseGuards(JwtAuthGuard)
  getProfileCards(@CurrentUser() user: AuthUser) {
    return this.authService.getProfileCards(user.id);
  }

  @Post('me/profile-cards')
  @UseGuards(JwtAuthGuard)
  createProfileCard(
    @CurrentUser() user: AuthUser,
    @Body() dto: CreateProfileCardDto,
  ) {
    return this.authService.createProfileCard(user.id, dto);
  }

  @Patch('me/profile-cards/:id')
  @UseGuards(JwtAuthGuard)
  updateProfileCard(
    @Param('id') cardId: string,
    @CurrentUser() user: AuthUser,
    @Body() dto: UpdateProfileCardDto,
  ) {
    return this.authService.updateProfileCard(user.id, cardId, dto);
  }

  @Delete('me/profile-cards/:id')
  @UseGuards(JwtAuthGuard)
  deleteProfileCard(
    @Param('id') cardId: string,
    @CurrentUser() user: AuthUser,
  ) {
    return this.authService.deleteProfileCard(user.id, cardId);
  }

  @Get('users/:id')
  @UseGuards(JwtAuthGuard)
  getUser(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.authService.getUser(id, user.id);
  }

  @Delete('me')
  @UseGuards(JwtAuthGuard)
  deleteAccount(@CurrentUser() user: AuthUser) {
    return this.authService.deleteAccount(user.id);
  }
}
