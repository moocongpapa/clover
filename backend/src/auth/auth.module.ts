import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { OptionalJwtAuthGuard } from '../common/guards/optional-jwt-auth.guard';

@Module({
  imports: [
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const secret = config.get<string>('JWT_SECRET');
        if (!secret || secret === 'change-me-in-production') {
          throw new Error(
            '⚠️  JWT_SECRET 환경변수가 설정되지 않았거나 기본값입니다. 강력한 랜덤 시크릿을 설정하세요.',
          );
        }
        const expiresIn = config.get<string>('JWT_EXPIRES_IN') || '3650d';
        return {
          secret,
          signOptions: {
            expiresIn: expiresIn as any,
          },
        };
      },
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtAuthGuard, OptionalJwtAuthGuard],
  exports: [JwtModule, JwtAuthGuard, OptionalJwtAuthGuard, AuthService],
})
export class AuthModule {}
