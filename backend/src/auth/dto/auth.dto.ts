import { IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

export class KakaoCallbackDto {
  @IsString()
  @IsNotEmpty()
  code!: string;
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
  profileImageUrl?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  bio?: string | null;
}
