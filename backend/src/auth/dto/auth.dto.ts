import { IsNotEmpty, IsOptional, IsString, MaxLength, IsInt, IsEnum, IsDateString, IsBoolean } from 'class-validator';
import { Gender } from '@prisma/client';

export class KakaoCallbackDto {
  @IsString()
  @IsNotEmpty()
  code!: string;

  @IsOptional()
  @IsString()
  redirectUri?: string;
}

export class DevLoginDto {
  @IsString()
  @IsNotEmpty()
  displayName!: string;

  @IsOptional()
  @IsString()
  profileImageUrl?: string;
}

export class UpdateProfileDto {
  @IsOptional()
  @IsString()
  @MaxLength(100)
  displayName?: string;

  @IsOptional()
  @IsString()
  profileImageUrl?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  bio?: string | null;

  @IsOptional()
  @IsInt()
  birthYear?: number | null;

  @IsOptional()
  @IsDateString()
  birthDate?: string | null;

  @IsOptional()
  @IsString()
  phoneNumber?: string | null;

  @IsOptional()
  @IsEnum(Gender)
  gender?: Gender | null;

  @IsOptional()
  @IsBoolean()
  isEarlyYear?: boolean | null;

  @IsOptional()
  @IsBoolean()
  kakaoNotifyEnabled?: boolean;

  @IsOptional()
  @IsBoolean()
  pushNotifyEnabled?: boolean;
}

export class CreateProfileCardDto {
  @IsString()
  @IsNotEmpty()
  nickname!: string;

  @IsOptional()
  @IsString()
  profileImageUrl?: string | null;
}

export class UpdateProfileCardDto {
  @IsOptional()
  @IsString()
  nickname?: string;

  @IsOptional()
  @IsString()
  profileImageUrl?: string | null;
}

export class UpdateFcmTokenDto {
  @IsString()
  @IsNotEmpty()
  fcmToken!: string;
}
