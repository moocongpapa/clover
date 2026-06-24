import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

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
