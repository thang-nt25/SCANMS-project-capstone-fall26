import { BadRequestException } from '@nestjs/common';
import { basename, extname } from 'path';

export type ChatAttachmentType = 'IMAGE' | 'VIDEO' | 'DOCUMENT';

export const MAX_CHAT_ATTACHMENT_BYTES = 50 * 1024 * 1024;
const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const MAX_DOCUMENT_BYTES = 20 * 1024 * 1024;

const hasPrefix = (buffer: Buffer, signature: number[]) =>
  buffer.length >= signature.length &&
  buffer.subarray(0, signature.length).equals(Buffer.from(signature));

const isZipContainer = (buffer: Buffer) =>
  buffer.length >= 4 &&
  buffer[0] === 0x50 &&
  buffer[1] === 0x4b &&
  [0x03, 0x05, 0x07].includes(buffer[2]) &&
  [0x04, 0x06, 0x08].includes(buffer[3]);

export function sanitizeChatAttachmentName(name: string): string {
  const safeName = basename(name || 'tep-tin')
    .replace(/[<>:"/\\|?*\u0000-\u001f]/g, '_')
    .trim()
    .slice(0, 255);
  return safeName || 'tep-tin';
}

export function validateChatAttachment(
  file?: Express.Multer.File,
): ChatAttachmentType {
  if (!file?.buffer?.length || file.size !== file.buffer.length) {
    throw new BadRequestException('Tệp tải lên trống hoặc không hợp lệ.');
  }

  const extension = extname(file.originalname || '').toLowerCase();
  const { buffer, mimetype, size } = file;
  const isPng =
    mimetype === 'image/png' &&
    extension === '.png' &&
    hasPrefix(buffer, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  const isJpeg =
    mimetype === 'image/jpeg' &&
    ['.jpg', '.jpeg'].includes(extension) &&
    hasPrefix(buffer, [0xff, 0xd8, 0xff]);
  if (isPng || isJpeg) {
    if (size > MAX_IMAGE_BYTES)
      throw new BadRequestException('Ảnh chat tối đa 5 MB.');
    return 'IMAGE';
  }

  const boxSize = buffer.length >= 16 ? buffer.readUInt32BE(0) : 0;
  const isFtyp =
    boxSize >= 16 &&
    boxSize <= buffer.length &&
    buffer.toString('ascii', 4, 8) === 'ftyp';
  const videoBrand = buffer.toString('ascii', 8, 12);
  const isMp4 =
    mimetype === 'video/mp4' &&
    extension === '.mp4' &&
    isFtyp &&
    ['isom', 'iso2', 'mp41', 'mp42', 'avc1', 'M4V '].includes(videoBrand);
  const isMov =
    mimetype === 'video/quicktime' &&
    extension === '.mov' &&
    isFtyp &&
    videoBrand === 'qt  ';
  const isWebm =
    mimetype === 'video/webm' &&
    extension === '.webm' &&
    hasPrefix(buffer, [0x1a, 0x45, 0xdf, 0xa3]);

  if (isMp4 || isMov || isWebm) return 'VIDEO';

  const isPdf =
    mimetype === 'application/pdf' &&
    extension === '.pdf' &&
    buffer.toString('ascii', 0, 5) === '%PDF-';
  const isOleDocument =
    hasPrefix(buffer, [0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1]) &&
    ['.doc', '.xls', '.ppt'].includes(extension) &&
    ['application/msword', 'application/vnd.ms-excel', 'application/vnd.ms-powerpoint'].includes(mimetype);
  const officeMimeByExtension: Record<string, string> = {
    '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    '.pptx': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  };
  const isOfficeOpenXml =
    isZipContainer(buffer) &&
    officeMimeByExtension[extension] === mimetype;
  const isTextDocument =
    ['.txt', '.csv'].includes(extension) &&
    ['text/plain', 'text/csv', 'application/csv', 'application/vnd.ms-excel'].includes(mimetype);

  if (isPdf || isOleDocument || isOfficeOpenXml || isTextDocument) {
    if (size > MAX_DOCUMENT_BYTES)
      throw new BadRequestException('Tài liệu chat tối đa 20 MB.');
    return 'DOCUMENT';
  }

  throw new BadRequestException(
    'Chỉ hỗ trợ ảnh JPG, PNG; video MP4, MOV, WEBM; và tệp PDF, Office, TXT hoặc CSV.',
  );
}

export function isCloudinaryChatAttachmentUrl(
  value?: string,
  type?: ChatAttachmentType,
): boolean {
  try {
    const url = new URL(value || '');
    const resourceType = url.pathname.split('/')[2];
    const expectedResourceType =
      type === 'IMAGE'
        ? 'image'
        : type === 'VIDEO'
          ? 'video'
          : type === 'DOCUMENT'
            ? 'raw'
            : null;
    return (
      url.protocol === 'https:' &&
      url.hostname === 'res.cloudinary.com' &&
      /^\/[^/]+\/(image|video|raw)\/upload\//.test(url.pathname) &&
      (!expectedResourceType || resourceType === expectedResourceType)
    );
  } catch {
    return false;
  }
}
