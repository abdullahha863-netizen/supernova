import { NextResponse } from "next/server";
import { promises as fs } from "fs";
import path from "path";
import { rateLimit } from "@/lib/rateLimit";
import { getClientIp } from "@/lib/getClientIp";

const UPLOAD_DIR = path.join(process.cwd(), "public", "uploads");
const ALLOWED_TYPES = ["image/png", "image/jpeg", "image/jpg"];
const MAX_FILE_SIZE = 5 * 1024 * 1024;

function detectImageExt(buffer) {
  const isPng =
    buffer.length >= 8 &&
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4e &&
    buffer[3] === 0x47 &&
    buffer[4] === 0x0d &&
    buffer[5] === 0x0a &&
    buffer[6] === 0x1a &&
    buffer[7] === 0x0a;

  if (isPng) return "png";

  const isJpeg =
    buffer.length >= 3 &&
    buffer[0] === 0xff &&
    buffer[1] === 0xd8 &&
    buffer[2] === 0xff;

  if (isJpeg) return "jpg";

  return null;
}

export async function POST(request) {
  try {
    const rl = rateLimit(getClientIp(request));
    if (!rl.ok) {
      return NextResponse.json({ success: false, message: "Rate limit" }, { status: 429 });
    }

    const formData = await request.formData();
    const file = formData.get("file");

    if (!file || typeof file === "string") {
      return NextResponse.json({ success: false, message: "No file provided" }, { status: 400 });
    }

    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json({ success: false, message: "Invalid file type" }, { status: 400 });
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json({ success: false, message: "File too large" }, { status: 400 });
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    await fs.mkdir(UPLOAD_DIR, { recursive: true });

    const extFromType = detectImageExt(buffer);
    if (!extFromType) {
      return NextResponse.json({ success: false, message: "Invalid file content" }, { status: 400 });
    }
    const filename = `${Date.now()}-${Math.random().toString(16).slice(2)}.${extFromType}`;
    const filePath = path.join(UPLOAD_DIR, filename);

    await fs.writeFile(filePath, buffer);

    const url = `/uploads/${filename}`;
    return NextResponse.json({ success: true, url });
  } catch (error) {
    console.error("Upload failed", error);
    return NextResponse.json({ success: false, message: "Upload failed" }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({ success: false, message: "Method not allowed" }, { status: 405 });
}

export async function PUT() {
  return NextResponse.json({ success: false, message: "Method not allowed" }, { status: 405 });
}

export async function DELETE() {
  return NextResponse.json({ success: false, message: "Method not allowed" }, { status: 405 });
}
