import { BadRequestException } from '@nestjs/common';
import { closeSync, openSync, readSync, unlinkSync } from 'fs';

export const IMAGE_MIME_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
]);

export const GALLERY_MIME_TYPES = new Set([
  ...IMAGE_MIME_TYPES,
  'video/mp4',
  'video/quicktime',
  'video/webm',
]);

const EXTENSION_BY_MIME: Record<string, string> = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
  'image/gif': '.gif',
  'video/mp4': '.mp4',
  'video/quicktime': '.mov',
  'video/webm': '.webm',
};

export function extensionForMime(mimeType: string): string {
  const extension = EXTENSION_BY_MIME[mimeType];
  if (!extension) {
    throw new BadRequestException('지원하지 않는 파일 형식입니다.');
  }
  return extension;
}

function hasPrefix(buffer: Buffer, bytes: number[]) {
  return bytes.every((byte, index) => buffer[index] === byte);
}

function hasValidSignature(buffer: Buffer, mimeType: string): boolean {
  switch (mimeType) {
    case 'image/jpeg':
      return hasPrefix(buffer, [0xff, 0xd8, 0xff]);
    case 'image/png':
      return hasPrefix(
        buffer,
        [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a],
      );
    case 'image/gif':
      return (
        buffer.subarray(0, 6).toString('ascii') === 'GIF87a' ||
        buffer.subarray(0, 6).toString('ascii') === 'GIF89a'
      );
    case 'image/webp':
      return (
        buffer.subarray(0, 4).toString('ascii') === 'RIFF' &&
        buffer.subarray(8, 12).toString('ascii') === 'WEBP'
      );
    case 'video/mp4':
    case 'video/quicktime':
      return buffer.subarray(4, 8).toString('ascii') === 'ftyp';
    case 'video/webm':
      return hasPrefix(buffer, [0x1a, 0x45, 0xdf, 0xa3]);
    default:
      return false;
  }
}

/** Reject a file whose bytes do not match the MIME type supplied by Multer. */
export function assertValidUpload(file: Express.Multer.File): void {
  const header = Buffer.alloc(16);
  let bytesRead = 0;
  try {
    const descriptor = openSync(file.path, 'r');
    try {
      bytesRead = readSync(descriptor, header, 0, header.length, 0);
    } finally {
      closeSync(descriptor);
    }
  } catch {
    bytesRead = 0;
  }

  if (bytesRead === 0 || !hasValidSignature(header, file.mimetype)) {
    try {
      unlinkSync(file.path);
    } catch {
      // Best effort cleanup; the upload has already been rejected.
    }
    throw new BadRequestException(
      '파일 내용이 신고된 파일 형식과 일치하지 않습니다.',
    );
  }
}
