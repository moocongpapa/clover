import { IsEnum } from 'class-validator';
import { VoteChoice } from '@prisma/client';

export class CastVoteDto {
  @IsEnum(VoteChoice)
  choice!: VoteChoice;
}
