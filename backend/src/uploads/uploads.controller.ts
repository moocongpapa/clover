import {
  BadRequestException,
  Controller,
  Post,
  UploadedFile,
  UploadedFiles,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor, FilesInterceptor } from '@nestjs/platform-express';
import { ConfigService } from '@nestjs/config';
import { diskStorage } from 'multer';
import { join } from 'path';
import { existsSync, mkdirSync } from 'fs';
import { nanoid } from 'nanoid';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import {
  assertValidUpload,
  extensionForMime,
  GALLERY_MIME_TYPES,
  IMAGE_MIME_TYPES,
} from './upload-validation';

const UPLOAD_DIR_GROUPS = join(process.cwd(), 'uploads', 'groups');
const UPLOAD_DIR_PROFILES = join(process.cwd(), 'uploads', 'profiles');
const UPLOAD_DIR_GALLERY = join(process.cwd(), 'uploads', 'gallery');

const MAX_SIZE = 5 * 1024 * 1024;
const MAX_GALLERY_SIZE = 50 * 1024 * 1024;

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
        cb(null, `${nanoid(12)}${extensionForMime(file.mimetype)}`);
      },
    }),
    limits: { fileSize: MAX_SIZE },
    fileFilter: (_req, file, cb) => {
      if (!IMAGE_MIME_TYPES.has(file.mimetype)) {
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

function galleryUploadInterceptor(uploadDir: string) {
  return FileInterceptor('file', {
    storage: diskStorage({
      destination: (_req, _file, cb) => {
        ensureUploadDir(uploadDir);
        cb(null, uploadDir);
      },
      filename: (_req, file, cb) => {
        cb(null, `${nanoid(12)}${extensionForMime(file.mimetype)}`);
      },
    }),
    limits: { fileSize: MAX_GALLERY_SIZE },
    fileFilter: (_req, file, cb) => {
      if (!GALLERY_MIME_TYPES.has(file.mimetype)) {
        cb(
          new BadRequestException(
            '이미지(JPEG, PNG, WebP, GIF) 또는 동영상(MP4, MOV, WebM) 파일만 업로드할 수 있습니다.',
          ),
          false,
        );
        return;
      }
      cb(null, true);
    },
  });
}

function galleryMultipleUploadInterceptor(uploadDir: string) {
  return FilesInterceptor('files', 20, {
    storage: diskStorage({
      destination: (_req, _file, cb) => {
        ensureUploadDir(uploadDir);
        cb(null, uploadDir);
      },
      filename: (_req, file, cb) => {
        cb(null, `${nanoid(12)}${extensionForMime(file.mimetype)}`);
      },
    }),
    limits: { fileSize: MAX_GALLERY_SIZE },
    fileFilter: (_req, file, cb) => {
      if (!GALLERY_MIME_TYPES.has(file.mimetype)) {
        cb(
          new BadRequestException(
            '이미지(JPEG, PNG, WebP, GIF) 또는 동영상(MP4, MOV, WebM) 파일만 업로드할 수 있습니다.',
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
  folder: 'groups' | 'profiles' | 'gallery',
  filename: string,
) {
  const port = config.get<number>('PORT', 3000);
  const publicBase =
    config.get<string>('API_PUBLIC_URL') ??
    (process.env.NODE_ENV === 'production' || process.env.RENDER
      ? 'https://clover-backend-vm9k.onrender.com'
      : `http://localhost:${port}`);
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
    assertValidUpload(file);

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
    assertValidUpload(file);

    return {
      url: buildPublicUploadUrl(this.config, 'profiles', file.filename),
      filename: file.filename,
    };
  }

  @Post('gallery')
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(galleryUploadInterceptor(UPLOAD_DIR_GALLERY))
  uploadGalleryFile(@UploadedFile() file: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException('파일을 선택해 주세요.');
    }
    assertValidUpload(file);

    const fileType = file.mimetype.startsWith('video/') ? 'VIDEO' : 'IMAGE';

    return {
      url: buildPublicUploadUrl(this.config, 'gallery', file.filename),
      filename: file.filename,
      fileType,
    };
  }

  @Post('gallery/multiple')
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(galleryMultipleUploadInterceptor(UPLOAD_DIR_GALLERY))
  uploadMultipleGalleryFiles(@UploadedFiles() files: Express.Multer.File[]) {
    if (!files || files.length === 0) {
      throw new BadRequestException('업로드할 파일을 선택해 주세요.');
    }
    files.forEach(assertValidUpload);

    return files.map((file) => ({
      url: buildPublicUploadUrl(this.config, 'gallery', file.filename),
      filename: file.filename,
      fileType: file.mimetype.startsWith('video/') ? 'VIDEO' : 'IMAGE',
    }));
  }
}
