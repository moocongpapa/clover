import {
  IsDateString,
  IsArray,
  ArrayMaxSize,
  ArrayUnique,
  IsEnum,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { VoteChoice } from '@prisma/client';

const TIME_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/;

export class CreateEventDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(150)
  title!: string;

  @IsDateString()
  date!: string;

  @IsString()
  @IsNotEmpty()
  @Matches(TIME_PATTERN, { message: '시작 시간은 HH:MM 형식이어야 합니다.' })
  startTime!: string;

  @IsOptional()
  @IsString()
  @Matches(TIME_PATTERN, { message: '종료 시간은 HH:MM 형식이어야 합니다.' })
  endTime?: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(300)
  location!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(4_000)
  description!: string;

  @IsOptional()
  @IsString()
  reminderOffsets?: string; // 쉼표로 구분된 시간 오프셋 목록

  @IsOptional()
  @IsIn(['none', 'weekly', 'biweekly'])
  repeatType?: 'none' | 'weekly' | 'biweekly';

  @IsOptional()
  @IsInt()
  @Min(2)
  @Max(8)
  repeatCount?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(14)
  openDaysBefore?: number;

  @IsOptional()
  @IsString()
  @Matches(TIME_PATTERN, { message: '오픈 시간은 HH:MM 형식이어야 합니다.' })
  openTime?: string;
}

export class SplitTeamMemberDto {
  @IsString()
  @IsNotEmpty()
  userId!: string;

  @IsEnum(VoteChoice)
  choice!: VoteChoice;
}

export class SplitTeamsDto {
  @IsInt()
  @Min(2)
  @Max(4)
  teamCount!: number;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(1_000)
  @ArrayUnique((member: SplitTeamMemberDto) => member.userId)
  @ValidateNested({ each: true })
  @Type(() => SplitTeamMemberDto)
  members?: SplitTeamMemberDto[];
}

export class UpdateEventDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(150)
  title!: string;

  @IsDateString()
  date!: string;

  @IsString()
  @IsNotEmpty()
  @Matches(TIME_PATTERN, { message: '시작 시간은 HH:MM 형식이어야 합니다.' })
  startTime!: string;

  @IsOptional()
  @IsString()
  @Matches(TIME_PATTERN, { message: '종료 시간은 HH:MM 형식이어야 합니다.' })
  endTime?: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(300)
  location!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(4_000)
  description!: string;

  @IsOptional()
  @IsString()
  reminderOffsets?: string;
}

export class CreateCommentDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(2_000)
  content!: string;
}
