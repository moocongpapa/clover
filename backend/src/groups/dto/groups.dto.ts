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
}

export class UpdateMemberDto {
  @IsOptional()
  @IsEnum(MemberStatus)
  status?: MemberStatus;

  @IsOptional()
  @IsEnum(MemberRole)
  role?: MemberRole;
}

export class TransferPresidentDto {
  @IsString()
  @IsNotEmpty()
  newPresidentUserId!: string;
}
