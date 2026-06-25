import {
  BadRequestException,
  Controller,
  Post,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ConfigService } from '@nestjs/config';
import { diskStorage } from 'multer';
import { extname, join } from 'path';
import { existsSync, mkdirSync } from 'fs';
import { nanoid } from 'nanoid';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';

const UPLOAD_DIR_GROUPS = join(process.cwd(), 'uploads', 'groups');
const UPLOAD_DIR_PROFILES = join(process.cwd(), 'uploads', 'profiles');
const MAX_SIZE = 5 * 1024 * 1024;
const ALLOWED_MIME = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
]);

function ensureUploadDir(dir: string) {
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }
}

function imageUploadInterceptor(uploadDir: string) {
  return FileInterceptor('image', {
    storage: diskStorage({
      destination: (_req, _file, cb) => {
        ensureUploadDir(uploadDir);
        cb(null, uploadDir);
      },
      filename: (_req, file, cb) => {
        const ext =
          extname(file.originalname).toLowerCase() ||
          (file.mimetype === 'image/png'
            ? '.png'
            : file.mimetype === 'image/webp'
              ? '.webp'
              : file.mimetype === 'image/gif'
                ? '.gif'
                : '.jpg');
        cb(null, `${nanoid(12)}${ext}`);
      },
    }),
    limits: { fileSize: MAX_SIZE },
    fileFilter: (_req, file, cb) => {
      if (!ALLOWED_MIME.has(file.mimetype)) {
        cb(
          new BadRequestException(
            'JPEG, PNG, WebP, GIF 이미지만 업로드할 수 있습니다.',
          ),
          false,
        );
        return;
      }
      cb(null, true);
    },
  });
}

function buildPublicUploadUrl(
  config: ConfigService,
  folder: 'groups' | 'profiles',
  filename: string,
) {
  const port = config.get<number>('PORT', 3000);
  const publicBase =
    config.get<string>('API_PUBLIC_URL') ?? `http://localhost:${port}`;
  return `${publicBase}/uploads/${folder}/${filename}`;
}

@Controller('uploads')
export class UploadsController {
  constructor(private readonly config: ConfigService) {}

  @Post('group-image')
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(imageUploadInterceptor(UPLOAD_DIR_GROUPS))
  uploadGroupImage(@UploadedFile() file: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException('이미지 파일을 선택해 주세요.');
    }

    return {
      url: buildPublicUploadUrl(this.config, 'groups', file.filename),
      filename: file.filename,
    };
  }

  @Post('profile-image')
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(imageUploadInterceptor(UPLOAD_DIR_PROFILES))
  uploadProfileImage(@UploadedFile() file: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException('이미지 파일을 선택해 주세요.');
    }

    return {
      url: buildPublicUploadUrl(this.config, 'profiles', file.filename),
      filename: file.filename,
    };
  }
}
