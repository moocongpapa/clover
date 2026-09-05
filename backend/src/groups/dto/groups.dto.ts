import {
  IsBoolean,
  IsArray,
  IsEnum,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUrl,
  Max,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { MemberRole, MemberStatus } from '@prisma/client';

const VALID_DUE_DAYS = [
  ...Array.from({ length: 28 }, (_, index) => index + 1),
  31,
] as const;

export class GroupArenaDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  placeName!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(300)
  address!: string;
}

export class CreateGroupDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  name!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(2_000)
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
  @IsInt()
  @Min(1)
  @Max(1_000)
  maxMembers?: number;

  @IsOptional()
  @IsString()
  customSportName?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(10_000_000)
  monthlyFee?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(31)
  @IsIn(VALID_DUE_DAYS)
  dueDay?: number;

  @IsOptional()
  @IsBoolean()
  officerFeeExempt?: boolean;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => GroupArenaDto)
  arenas?: GroupArenaDto[];
}

export class UpdateGroupDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  name!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(2_000)
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
  @IsInt()
  @Min(1)
  @Max(1_000)
  maxMembers?: number;

  @IsOptional()
  @IsString()
  customSportName?: string | null;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(10_000_000)
  monthlyFee?: number | null;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(31)
  @IsIn(VALID_DUE_DAYS)
  dueDay?: number | null;

  @IsOptional()
  @IsBoolean()
  officerFeeExempt?: boolean;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => GroupArenaDto)
  arenas?: GroupArenaDto[];
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
  @IsIn(['HEALTHY', 'INJURED', 'UNAVAILABLE'])
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
  @IsUrl({ protocols: ['http', 'https'], require_protocol: true })
  url!: string;

  @IsString()
  @IsNotEmpty()
  @IsIn(['IMAGE', 'VIDEO'])
  fileType!: 'IMAGE' | 'VIDEO';
}

export class LinkProfileCardDto {
  @IsOptional()
  @IsString()
  profileCardId?: string | null;
}
