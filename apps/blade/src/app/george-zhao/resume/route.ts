import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { NextResponse } from 'next/server';

export async function GET() {
  // Resolve path relative to this route file to avoid CWD differences
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = path.dirname(__filename);

  const candidates = [
    path.join(__dirname, 'george_zhao_resume.pdf'), // same folder as route
    path.join(__dirname, '..', 'george_zhao_resume.pdf'), // parent folder
    path.join(process.cwd(), 'apps', 'blade', 'src', 'app', 'george-zhao', 'george_zhao_resume.pdf'), // workspace-root fallback
  ];

  let filePath: string | null = null;
  for (const p of candidates) {
    try {
      await fs.promises.access(p, fs.constants.R_OK);
      filePath = p;
      break;
    } catch (_) {
      // continue
    }
  }

  if (!filePath) {
    return new NextResponse('Not found', { status: 404 });
  }

  const fileBuffer = await fs.promises.readFile(filePath);
  const uint8 = new Uint8Array(fileBuffer);
  return new NextResponse(uint8, {
    status: 200,
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': 'inline; filename="george_zhao_resume.pdf"',
    },
  });
}
