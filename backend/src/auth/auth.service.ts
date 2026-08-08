import {
  BadRequestException,
  Injectable,
  Logger,
  UnauthorizedException,
  ForbiddenException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import axios from 'axios';
import { PrismaService } from '../prisma/prisma.service';
import { DevLoginDto, UpdateProfileDto, CreateProfileCardDto, UpdateProfileCardDto } from './dto/auth.dto';
import { Gender } from '@prisma/client';

const USER_PROFILE_SELECT = {
  id: true,
  displayName: true,
  profileImageUrl: true,
  kakaoId: true,
  gender: true,
  birthYear: true,
  birthDate: true,
  isEarlyYear: true,
  phoneNumber: true,
  bio: true,
  kakaoNotifyEnabled: true,
  pushNotifyEnabled: true,
  createdAt: true,
  role: true,
} as const;

interface KakaoTokenResponse {
  access_token: string;
}

interface KakaoUserResponse {
  id: number;
  properties: {
    nickname: string;
    profile_image?: string;
  };
  kakao_account?: {
    email?: string;
    gender?: string;
    birthyear?: string;
    birthday?: string;
    phone_number?: string;
  };
}

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly config: ConfigService,
  ) {}

  async kakaoCallback(code: string, customRedirectUri?: string) {
    const restApiKey = this.config.get<string>('KAKAO_REST_API_KEY');
    const redirectUri = customRedirectUri || this.config.get<string>('KAKAO_REDIRECT_URI') || 'http://localhost:5174/login';

    if (!restApiKey || code.startsWith('mock_kakao_code')) {
      const parts = code.split(':');
      const nickname = parts[1] ? decodeURIComponent(parts[1]).trim() : '카카오 사용자';
      const kakaoId = `kakao-${nickname.toLowerCase().replace(/\s+/g, '-')}`;

      const kakaoUser = {
        id: kakaoId,
        properties: {
          nickname: nickname || '카카오 사용자',
          profile_image: 'https://k.kakaocdn.net/dn/dpk94b/btqmnhh2t6b/9g0i4k9Kk58k266000000/img_640x640.jpg',
        },
      };

      const user = await this.prisma.user.upsert({
        where: { kakaoId: String(kakaoUser.id) },
        update: {
          displayName: kakaoUser.properties.nickname,
          profileImageUrl: kakaoUser.properties.profile_image,
        },
        create: {
          kakaoId: String(kakaoUser.id),
          displayName: kakaoUser.properties.nickname,
          profileImageUrl: kakaoUser.properties.profile_image,
          role: nickname === '김완석' ? 'ADMIN' : 'MEMBER',
        },
      });

      return this.issueToken(user);
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

    // Sync Kakao Friends list talk UUIDs
    try {
      const friendsRes = await axios.get<{ elements: Array<{ id: number; uuid: string }> }>(
        'https://kapi.kakao.com/v1/api/talk/friends',
        {
          headers: {
            Authorization: `Bearer ${tokenRes.data.access_token}`,
          },
        },
      );
      if (friendsRes.data?.elements) {
        for (const friend of friendsRes.data.elements) {
          await this.prisma.user.updateMany({
            where: { kakaoId: String(friend.id) },
            data: { kakaoChannelUserKey: friend.uuid },
          });
        }
      }
    } catch (e) {
      this.logger.warn(`Failed to sync Kakao friends UUIDs: ${e}`);
    }

    const kakaoUser = userRes.data;
    const account = kakaoUser.kakao_account;

    let gender: Gender | null = null;
    if (account?.gender === 'male') gender = Gender.MALE;
    if (account?.gender === 'female') gender = Gender.FEMALE;

    let birthYear: number | null = null;
    if (account?.birthyear) {
      birthYear = parseInt(account.birthyear, 10);
    }

    let birthDate: Date | null = null;
    if (account?.birthyear && account?.birthday) {
      const month = parseInt(account.birthday.slice(0, 2), 10) - 1;
      const day = parseInt(account.birthday.slice(2, 4), 10);
      birthDate = new Date(birthYear || 1900, month, day);
    }

    let phoneNumber: string | null = null;
    if (account?.phone_number) {
      const rawPhone = account.phone_number.replace(/\D/g, '');
      if (rawPhone.startsWith('82')) {
        phoneNumber = '0' + rawPhone.slice(2);
      } else {
        phoneNumber = rawPhone;
      }
    }

    const user = await this.prisma.user.upsert({
      where: { kakaoId: String(kakaoUser.id) },
      update: {
        displayName: kakaoUser.properties.nickname,
        profileImageUrl: kakaoUser.properties.profile_image ?? null,
        ...(gender ? { gender } : {}),
        ...(birthYear ? { birthYear } : {}),
        ...(birthDate ? { birthDate } : {}),
        ...(phoneNumber ? { phoneNumber } : {}),
        role: kakaoUser.properties.nickname === '김완석' ? 'ADMIN' : 'MEMBER',
      },
      create: {
        kakaoId: String(kakaoUser.id),
        displayName: kakaoUser.properties.nickname,
        profileImageUrl: kakaoUser.properties.profile_image ?? null,
        gender,
        birthYear,
        birthDate,
        phoneNumber,
        role: kakaoUser.properties.nickname === '김완석' ? 'ADMIN' : 'MEMBER',
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
        role: dto.displayName === '김완석' ? 'ADMIN' : 'MEMBER',
      },
      create: {
        kakaoId,
        displayName: dto.displayName,
        profileImageUrl: dto.profileImageUrl ?? null,
        role: dto.displayName === '김완석' ? 'ADMIN' : 'MEMBER',
      },
    });

    return this.issueToken(user);
  }

  async getMe(userId: string) {
    const user = await this.prisma.user.findUniqueOrThrow({
      where: { id: userId },
      select: USER_PROFILE_SELECT,
    });
    
    // Check if the user has any profile cards
    const cardsCount = await this.prisma.userProfileCard.count({
      where: { userId },
    });
    
    if (cardsCount === 0) {
      // Create default profile card
      await this.prisma.userProfileCard.create({
        data: {
          userId,
          nickname: user.displayName || '이름 없음',
          profileImageUrl: user.profileImageUrl,
        },
      });
    }
    
    return user;
  }

  async updateProfile(userId: string, dto: UpdateProfileDto) {
    return this.prisma.user.update({
      where: { id: userId },
      data: {
        ...(dto.displayName !== undefined ? { displayName: dto.displayName } : {}),
        ...(dto.profileImageUrl !== undefined
          ? { profileImageUrl: dto.profileImageUrl }
          : {}),
        ...(dto.bio !== undefined ? { bio: dto.bio } : {}),
        ...(dto.birthYear !== undefined ? { birthYear: dto.birthYear } : {}),
        ...(dto.birthDate !== undefined
          ? { birthDate: dto.birthDate ? new Date(dto.birthDate) : null }
          : {}),
        ...(dto.phoneNumber !== undefined ? { phoneNumber: dto.phoneNumber } : {}),
        ...(dto.gender !== undefined ? { gender: dto.gender } : {}),
        ...(dto.isEarlyYear !== undefined ? { isEarlyYear: dto.isEarlyYear ?? false } : {}),
        ...(dto.kakaoNotifyEnabled !== undefined ? { kakaoNotifyEnabled: dto.kakaoNotifyEnabled } : {}),
        ...(dto.pushNotifyEnabled !== undefined ? { pushNotifyEnabled: dto.pushNotifyEnabled } : {}),
      },
      select: USER_PROFILE_SELECT,
    });
  }

  async updateFcmToken(userId: string, fcmToken: string) {
    return this.prisma.user.update({
      where: { id: userId },
      data: { fcmToken },
      select: {
        id: true,
        displayName: true,
        fcmToken: true,
      },
    });
  }

  async getProfileCards(userId: string) {
    return this.prisma.userProfileCard.findMany({
      where: { userId },
      include: {
        memberships: {
          include: {
            group: {
              select: {
                id: true,
                name: true,
                profileImageUrl: true,
              },
            },
          },
        },
      },
    });
  }

  async createProfileCard(userId: string, dto: CreateProfileCardDto) {
    return this.prisma.userProfileCard.create({
      data: {
        userId,
        nickname: dto.nickname,
        profileImageUrl: dto.profileImageUrl ?? null,
      },
    });
  }

  async updateProfileCard(userId: string, cardId: string, dto: UpdateProfileCardDto) {
    const card = await this.prisma.userProfileCard.findUnique({
      where: { id: cardId },
    });
    if (!card || card.userId !== userId) {
      throw new ForbiddenException('권한이 없습니다.');
    }
    return this.prisma.userProfileCard.update({
      where: { id: cardId },
      data: {
        ...(dto.nickname !== undefined ? { nickname: dto.nickname } : {}),
        ...(dto.profileImageUrl !== undefined ? { profileImageUrl: dto.profileImageUrl } : {}),
      },
    });
  }

  async deleteProfileCard(userId: string, cardId: string) {
    const card = await this.prisma.userProfileCard.findUnique({
      where: { id: cardId },
    });
    if (!card || card.userId !== userId) {
      throw new ForbiddenException('권한이 없습니다.');
    }
    await this.prisma.userProfileCard.delete({
      where: { id: cardId },
    });
    return { ok: true };
  }

  getKakaoLoginUrl() {
    const restApiKey = this.config.get<string>('KAKAO_REST_API_KEY');
    const redirectUri = this.config.get<string>('KAKAO_REDIRECT_URI') || 'http://localhost:5174/login';

    if (!restApiKey) {
      return null;
    }

    const params = new URLSearchParams({
      client_id: restApiKey,
      redirect_uri: redirectUri,
      response_type: 'code',
    });

    return `https://kauth.kakao.com/oauth/authorize?${params.toString()}`;
  }

  private issueToken(user: {
    id: string;
    displayName: string;
    profileImageUrl: string | null;
    kakaoId: string;
    gender?: string | null;
    birthYear?: number | null;
    birthDate?: Date | string | null;
    phoneNumber?: string | null;
    bio?: string | null;
    kakaoNotifyEnabled: boolean;
    pushNotifyEnabled: boolean;
  }) {
    const accessToken = this.jwtService.sign({ sub: user.id });
    return {
      accessToken,
      user: {
        id: user.id,
        displayName: user.displayName,
        profileImageUrl: user.profileImageUrl,
        kakaoId: user.kakaoId,
        gender: user.gender ?? null,
        birthYear: user.birthYear ?? null,
        birthDate: user.birthDate ?? null,
        phoneNumber: user.phoneNumber ?? null,
        bio: user.bio ?? null,
        kakaoNotifyEnabled: user.kakaoNotifyEnabled,
        pushNotifyEnabled: user.pushNotifyEnabled,
      },
    };
  }
}
