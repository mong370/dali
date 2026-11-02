import { randomUUID } from 'node:crypto';
import { mkdir, open, rename, unlink } from 'node:fs/promises';
import path from 'node:path';
import { Router } from 'express';
import multer from 'multer';
import { z } from 'zod';
import { env } from '../../config/env.js';
import { ApiError } from '../../lib/ApiError.js';
import { requireAdmin } from '../../middleware/auth.js';

const MB = 1024 * 1024;

export interface DetectedFile {
  /** Top-level folder: images, videos, documents. */
  kind: 'images' | 'videos' | 'documents';
  extension: string;
  maxBytes: number;
}

/**
 * Identifies a file from its first bytes, since the browser-supplied type can be
 * anything. Formats that can carry scripts, such as SVG and HTML, are refused.
 */
export function detectFile(head: Buffer, originalName = ''): DetectedFile | null {
  if (head.length < 12) return null;
  const image = (extension: string): DetectedFile => ({ kind: 'images', extension, maxBytes: 5 * MB });
  const video = (extension: string): DetectedFile => ({ kind: 'videos', extension, maxBytes: 100 * MB });
  const document = (extension: string): DetectedFile => ({ kind: 'documents', extension, maxBytes: 20 * MB });

  if (head[0] === 0xff && head[1] === 0xd8 && head[2] === 0xff) return image('jpg');
  if (head.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return image('png');
  if (head.subarray(0, 4).toString('latin1') === 'RIFF' && head.subarray(8, 12).toString('latin1') === 'WEBP') {
    return image('webp');
  }
  if (head.subarray(4, 8).toString('latin1') === 'ftyp') return video('mp4');
  if (head.subarray(0, 4).equals(Buffer.from([0x1a, 0x45, 0xdf, 0xa3]))) return video('webm');
  if (head.subarray(0, 5).toString('latin1') === '%PDF-') return document('pdf');
  // Word and Excel files are zip containers, so the name tells them apart from other zips.
  if (head.subarray(0, 4).equals(Buffer.from([0x50, 0x4b, 0x03, 0x04]))) {
    const extension = path.extname(originalName).slice(1).toLowerCase();
    if (extension === 'docx' || extension === 'xlsx') return document(extension);
  }
  return null;
}

async function readHead(filePath: string) {
  const file = await open(filePath, 'r');
  try {
    const { buffer, bytesRead } = await file.read(Buffer.alloc(16), 0, 16, 0);
    return buffer.subarray(0, bytesRead);
  } finally {
    await file.close();
  }
}

const tempDir = () => path.join(path.resolve(env.UPLOAD_DIR), '.tmp');

// Written to disk rather than memory, so a large video cannot exhaust the server's RAM.
// The temporary folder is on the same disk as the final one, so moving a file is instant.
const upload = multer({
  limits: { fileSize: 100 * MB, files: 1 },
  storage: multer.diskStorage({
    destination: (_req, _file, done) => {
      mkdir(tempDir(), { recursive: true }).then(
        () => done(null, tempDir()),
        (error: Error) => done(error, ''),
      );
    },
    filename: (_req, _file, done) => done(null, randomUUID()),
  }),
});

const folderField = z.enum(['products', 'categories', 'banners', 'general']).catch('general');

export const uploadRouter = Router();

uploadRouter.post('/', requireAdmin, upload.single('file'), async (req, res) => {
  if (!req.file) throw ApiError.badRequest('Choose a file to upload');
  const temp = req.file.path;
  let moved = false;
  try {
    const detected = detectFile(await readHead(temp), req.file.originalname);
    if (!detected) {
      throw ApiError.badRequest('Use a JPG, PNG, WebP, MP4, WebM, PDF, DOCX or XLSX file', 'UNSUPPORTED_FILE');
    }
    if (req.file.size > detected.maxBytes) {
      throw ApiError.badRequest(`That file is too large. The limit is ${detected.maxBytes / MB} MB`, 'FILE_TOO_LARGE');
    }

    // e.g. images/products/2026/11/<id>.jpg
    const now = new Date();
    const relative = path.posix.join(
      detected.kind,
      folderField.parse(req.body?.folder),
      String(now.getFullYear()),
      String(now.getMonth() + 1).padStart(2, '0'),
      `${randomUUID()}.${detected.extension}`,
    );
    const destination = path.join(path.resolve(env.UPLOAD_DIR), relative);
    await mkdir(path.dirname(destination), { recursive: true });
    await rename(temp, destination);
    moved = true;
    res.status(201).json({ url: `/uploads/${relative}`, kind: detected.kind });
  } finally {
    if (!moved) await unlink(temp).catch(() => undefined);
  }
});
