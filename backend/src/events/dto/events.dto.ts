import {
  IsDateString,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  Max,
  Min,
} from 'class-validator';

const TIME_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/;

export class CreateEventDto {
  @IsString()
  @IsNotEmpty()
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
  location!: string;

  @IsString()
  @IsNotEmpty()
  description!: string;

  @IsOptional()
  @IsString()
  reminderOffsets?: string; // 쉼표로 구분된 시간 오프셋 목록

  @IsOptional()
  @IsString()
  repeatType?: 'none' | 'weekly' | 'biweekly';

  @IsOptional()
  @IsInt()
  @Min(2)
  @Max(8)
  repeatCount?: number;
}

import { VoteChoice } from '@prisma/client';

export class SplitTeamsDto {
  @IsInt()
  @Min(2)
  @Max(4)
  teamCount!: number;

  @IsOptional()
  members?: Array<{ userId: string; choice: VoteChoice }>;
}

export class UpdateEventDto {
  @IsString()
  @IsNotEmpty()
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
  location!: string;

  @IsString()
  @IsNotEmpty()
  description!: string;

  @IsOptional()
  @IsString()
  reminderOffsets?: string;
}

export class CreateCommentDto {
  @IsString()
  @IsNotEmpty()
  content!: string;
}
