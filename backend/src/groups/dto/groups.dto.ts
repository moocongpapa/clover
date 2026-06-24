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
