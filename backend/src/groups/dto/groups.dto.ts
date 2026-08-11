import {
  IsBoolean,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
} from 'class-validator';
import { MemberRole, MemberStatus } from '@prisma/client';

export class CreateGroupDto {
  @IsString()
  @IsNotEmpty()
  name!: string;

  @IsString()
  @IsNotEmpty()
  description!: string;

  @IsOptional()
  @IsString()
  profileImageUrl?: string;

  @IsString()
  @IsNotEmpty()
  category!: string;

  @IsBoolean()
  isPublic!: boolean;

  @IsString()
  @IsNotEmpty()
  activitySido!: string;

  @IsString()
  @IsNotEmpty()
  activitySigungu!: string;

  @IsOptional()
  @IsString()
  activityDistrict?: string;

  @IsOptional()
  @IsString()
  activityTown?: string;

  @IsOptional()
  @IsString()
  bankName?: string;

  @IsOptional()
  @IsString()
  bankAccountNumber?: string;

  @IsOptional()
  @IsString()
  bankAccountHolder?: string;

  @IsOptional()
  maxMembers?: number;

  @IsOptional()
  @IsString()
  customSportName?: string;

  @IsOptional()
  monthlyFee?: number;

  @IsOptional()
  dueDay?: number;

  @IsOptional()
  @IsBoolean()
  officerFeeExempt?: boolean;

  @IsOptional()
  arenas?: { placeName: string; address: string }[];
}

export class UpdateGroupDto {
  @IsString()
  @IsNotEmpty()
  name!: string;

  @IsString()
  @IsNotEmpty()
  description!: string;

  @IsOptional()
  @IsString()
  profileImageUrl?: string | null;

  @IsString()
  @IsNotEmpty()
  category!: string;

  @IsBoolean()
  isPublic!: boolean;

  @IsString()
  @IsNotEmpty()
  activitySido!: string;

  @IsString()
  @IsNotEmpty()
  activitySigungu!: string;

  @IsOptional()
  @IsString()
  activityDistrict?: string;

  @IsOptional()
  @IsString()
  activityTown?: string;

  @IsOptional()
  @IsString()
  bankName?: string | null;

  @IsOptional()
  @IsString()
  bankAccountNumber?: string | null;

  @IsOptional()
  @IsString()
  bankAccountHolder?: string | null;

  @IsOptional()
  maxMembers?: number;

  @IsOptional()
  @IsString()
  customSportName?: string | null;

  @IsOptional()
  monthlyFee?: number | null;

  @IsOptional()
  dueDay?: number | null;

  @IsOptional()
  @IsBoolean()
  officerFeeExempt?: boolean;

  @IsOptional()
  arenas?: { placeName: string; address: string }[];
}

export class UpdateMemberDto {
  @IsOptional()
  @IsEnum(MemberStatus)
  status?: MemberStatus;

  @IsOptional()
  @IsEnum(MemberRole)
  role?: MemberRole;
}

export class UpdateMyStatusDto {
  @IsString()
  @IsNotEmpty()
  userStatus!: string; // HEALTHY, INJURED, UNAVAILABLE
}

export class TransferPresidentDto {
  @IsString()
  @IsNotEmpty()
  newPresidentUserId!: string;
}

export class CreateGroupMediaDto {
  @IsString()
  @IsNotEmpty()
  url!: string;

  @IsString()
  @IsNotEmpty()
  fileType!: string; // IMAGE or VIDEO
}

export class LinkProfileCardDto {
  @IsOptional()
  @IsString()
  profileCardId?: string | null;
}
