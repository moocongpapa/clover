import {
  BadRequestException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import axios from 'axios';
import { PrismaService } from '../prisma/prisma.service';
import { DevLoginDto } from './dto/auth.dto';

interface KakaoTokenResponse {
  access_token: string;
}

interface KakaoUserResponse {
  id: number;
  properties: {
    nickname: string;
    profile_image?: string;
  };
}

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly config: ConfigService,
  ) {}

  async kakaoCallback(code: string) {
    const restApiKey = this.config.get<string>('KAKAO_REST_API_KEY');
    const redirectUri = this.config.get<string>('KAKAO_REDIRECT_URI');

    if (!restApiKey) {
      throw new BadRequestException(
        '카카오 API 키가 설정되지 않았습니다. 개발 모드 로그인을 사용하세요.',
      );
    }

    const tokenRes = await axios.post<KakaoTokenResponse>(
      'https://kauth.kakao.com/oauth/token',
      null,
      {
        params: {
          grant_type: 'authorization_code',
          client_id: restApiKey,
          redirect_uri: redirectUri,
          code,
        },
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      },
    );

    const userRes = await axios.get<KakaoUserResponse>(
      'https://kapi.kakao.com/v2/user/me',
      {
        headers: {
          Authorization: `Bearer ${tokenRes.data.access_token}`,
        },
      },
    );

    const kakaoUser = userRes.data;
    const user = await this.prisma.user.upsert({
      where: { kakaoId: String(kakaoUser.id) },
      update: {
        displayName: kakaoUser.properties.nickname,
        profileImageUrl: kakaoUser.properties.profile_image ?? null,
      },
      create: {
        kakaoId: String(kakaoUser.id),
        displayName: kakaoUser.properties.nickname,
        profileImageUrl: kakaoUser.properties.profile_image ?? null,
      },
    });

    return this.issueToken(user);
  }

  async devLogin(dto: DevLoginDto) {
    const enabled = this.config.get<string>('DEV_LOGIN_ENABLED') === 'true';
    if (!enabled) {
      throw new UnauthorizedException('개발 로그인이 비활성화되어 있습니다.');
    }

    const kakaoId = `dev-${dto.displayName.trim().toLowerCase().replace(/\s+/g, '-')}`;
    const user = await this.prisma.user.upsert({
      where: { kakaoId },
      update: {
        displayName: dto.displayName,
        profileImageUrl: dto.profileImageUrl ?? null,
      },
      create: {
        kakaoId,
        displayName: dto.displayName,
        profileImageUrl: dto.profileImageUrl ?? null,
      },
    });

    return this.issueToken(user);
  }

  async getMe(userId: string) {
    return this.prisma.user.findUniqueOrThrow({
      where: { id: userId },
      select: {
        id: true,
        displayName: true,
        profileImageUrl: true,
        kakaoId: true,
        createdAt: true,
      },
    });
  }

  getKakaoLoginUrl() {
    const restApiKey = this.config.get<string>('KAKAO_REST_API_KEY');
    const redirectUri = this.config.get<string>('KAKAO_REDIRECT_URI');

    if (!restApiKey) {
      return null;
    }

    const params = new URLSearchParams({
      client_id: restApiKey,
      redirect_uri: redirectUri ?? '',
      response_type: 'code',
    });

    return `https://kauth.kakao.com/oauth/authorize?${params.toString()}`;
  }

  private issueToken(user: { id: string; displayName: string; profileImageUrl: string | null; kakaoId: string }) {
    const accessToken = this.jwtService.sign({ sub: user.id });
    return {
      accessToken,
      user: {
        id: user.id,
        displayName: user.displayName,
        profileImageUrl: user.profileImageUrl,
        kakaoId: user.kakaoId,
      },
    };
  }
}
