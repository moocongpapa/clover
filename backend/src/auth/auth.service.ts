import {
  BadRequestException,
  Injectable,
  Logger,
  UnauthorizedException,
  ForbiddenException,
  NotFoundException,
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
  properties?: {
    nickname?: string;
    profile_image?: string;
  };
  kakao_account?: {
    profile?: {
      nickname?: string;
      profile_image_url?: string;
    };
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
    const redirectUri = customRedirectUri || this.config.get<string>('KAKAO_REDIRECT_URI') || 'https://clover-gilt.vercel.app/login';

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

    const clientSecret = this.config.get<string>('KAKAO_CLIENT_SECRET');

    let tokenRes: { data: KakaoTokenResponse };
    try {
      tokenRes = await axios.post<KakaoTokenResponse>(
        'https://kauth.kakao.com/oauth/token',
        null,
        {
          params: {
            grant_type: 'authorization_code',
            client_id: restApiKey,
            redirect_uri: redirectUri,
            code,
            ...(clientSecret ? { client_secret: clientSecret } : {}),
          },
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        },
      );
    } catch (err: any) {
      const errorMsg = err.response?.data?.error_description || err.response?.data?.error || err.message;
      this.logger.error(`Kakao token request failed: ${errorMsg}`, err.response?.data);
      throw new BadRequestException(`카카오 로그인 토큰 발급 실패: ${errorMsg}`);
    }

    let userRes: { data: KakaoUserResponse };
    try {
      userRes = await axios.get<KakaoUserResponse>(
        'https://kapi.kakao.com/v2/user/me',
        {
          headers: {
            Authorization: `Bearer ${tokenRes.data.access_token}`,
          },
        },
      );
    } catch (err: any) {
      const errorMsg = err.response?.data?.error_description || err.message;
      this.logger.error(`Kakao user profile request failed: ${errorMsg}`);
      throw new UnauthorizedException(`카카오 사용자 정보 조회 실패: ${errorMsg}`);
    }

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
    const nickname = kakaoUser.properties?.nickname || account?.profile?.nickname || '카카오 사용자';

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

    const rawImage = kakaoUser.properties?.profile_image || account?.profile?.profile_image_url || null;
    const profileImageUrl = rawImage ? rawImage.replace(/^http:\/\//i, 'https://') : null;

    const user = await this.prisma.user.upsert({
      where: { kakaoId: String(kakaoUser.id) },
      update: {
        displayName: nickname,
        profileImageUrl,
        ...(gender ? { gender } : {}),
        ...(birthYear ? { birthYear } : {}),
        ...(birthDate ? { birthDate } : {}),
        ...(phoneNumber ? { phoneNumber } : {}),
        role: nickname === '김완석' ? 'ADMIN' : 'MEMBER',
      },
      create: {
        kakaoId: String(kakaoUser.id),
        displayName: nickname,
        profileImageUrl,
        gender,
        birthYear,
        birthDate,
        phoneNumber,
        role: nickname === '김완석' ? 'ADMIN' : 'MEMBER',
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
        gender: Gender.MALE,
        birthYear: 1990,
        birthDate: new Date(1990, 0, 1),
        phoneNumber: '010-1234-5678',
      },
      create: {
        kakaoId,
        displayName: dto.displayName,
        profileImageUrl: dto.profileImageUrl ?? null,
        role: dto.displayName === '김완석' ? 'ADMIN' : 'MEMBER',
        gender: Gender.MALE,
        birthYear: 1990,
        birthDate: new Date(1990, 0, 1),
        phoneNumber: '010-1234-5678',
      },
    });

    return this.issueToken(user);
  }

  async getMe(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: USER_PROFILE_SELECT,
    });
    if (!user) {
      throw new UnauthorizedException('사용자를 찾을 수 없습니다. 다시 로그인해 주세요.');
    }
    
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

  async getUser(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: USER_PROFILE_SELECT,
    });
    if (!user) {
      throw new NotFoundException('존재하지 않는 회원입니다.');
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

  async deleteAccount(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        memberships: {
          where: { role: 'PRESIDENT' },
          include: {
            group: {
              include: {
                members: { where: { status: 'APPROVED' } },
              },
            },
          },
        },
      },
    });

    if (!user) {
      throw new NotFoundException('사용자를 찾을 수 없습니다.');
    }

    const presidentGroupsWithOthers = user.memberships.filter(
      (m) => m.group.members.length > 1,
    );

    if (presidentGroupsWithOthers.length > 0) {
      const groupNames = presidentGroupsWithOthers.map((m) => `「${m.group.name}」`).join(', ');
      throw new BadRequestException(
        `회장으로 운영 중인 모임(${groupNames})이 있습니다. 다른 운영진에게 회장 권한을 양도하거나 모임을 정리한 후 탈퇴해 주세요.`,
      );
    }

    for (const m of user.memberships) {
      if (m.group.members.length <= 1) {
        await this.prisma.group.delete({ where: { id: m.groupId } }).catch(() => null);
      }
    }

    await this.prisma.user.delete({ where: { id: userId } });
    return { success: true };
  }

  getKakaoLoginUrl() {
    const restApiKey = this.config.get<string>('KAKAO_REST_API_KEY');
    const redirectUri = this.config.get<string>('KAKAO_REDIRECT_URI') || 'https://clover-gilt.vercel.app/login';

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
