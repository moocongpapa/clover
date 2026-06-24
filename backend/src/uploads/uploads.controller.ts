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

const UPLOAD_DIR = join(process.cwd(), 'uploads', 'groups');
const MAX_SIZE = 5 * 1024 * 1024;
const ALLOWED_MIME = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
]);

function ensureUploadDir() {
  if (!existsSync(UPLOAD_DIR)) {
    mkdirSync(UPLOAD_DIR, { recursive: true });
  }
}

@Controller('uploads')
export class UploadsController {
  constructor(private readonly config: ConfigService) {}

  @Post('group-image')
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(
    FileInterceptor('image', {
      storage: diskStorage({
        destination: (_req, _file, cb) => {
          ensureUploadDir();
          cb(null, UPLOAD_DIR);
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
    }),
  )
  uploadGroupImage(@UploadedFile() file: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException('이미지 파일을 선택해 주세요.');
    }

    const port = this.config.get<number>('PORT', 3000);
    const publicBase =
      this.config.get<string>('API_PUBLIC_URL') ??
      `http://localhost:${port}`;

    return {
      url: `${publicBase}/uploads/groups/${file.filename}`,
      filename: file.filename,
    };
  }
}
