import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const MAX_SIZE = 5 * 1024 * 1024; // 5 MB
const ALLOWED_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/heic",
  "application/pdf",
];

/** Upload a receipt file (multipart form data) */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const tx = await prisma.transaction.findUnique({ where: { id } });
    if (!tx) {
      return NextResponse.json({ error: "Transaction not found" }, { status: 404 });
    }

    const formData = await request.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json(
        { error: `File type '${file.type}' not allowed. Use JPEG, PNG, WebP, HEIC, or PDF.` },
        { status: 400 }
      );
    }

    if (file.size > MAX_SIZE) {
      return NextResponse.json(
        { error: `File too large (${(file.size / 1024 / 1024).toFixed(1)} MB). Max 5 MB.` },
        { status: 400 }
      );
    }

    const buffer = await file.arrayBuffer();
    const base64 = Buffer.from(buffer).toString("base64");

    await prisma.transaction.update({
      where: { id },
      data: {
        receiptSaved: true,
        receiptData: base64,
        receiptName: file.name,
        receiptType: file.type,
      },
    });

    return NextResponse.json({ success: true, fileName: file.name });
  } catch (error) {
    console.error("POST /api/transactions/[id]/receipt error:", error);
    return NextResponse.json({ error: "Failed to upload receipt" }, { status: 500 });
  }
}

/** Serve the receipt file with proper content-type */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const tx = await prisma.transaction.findUnique({
      where: { id },
      select: { receiptData: true, receiptName: true, receiptType: true },
    });

    if (!tx || !tx.receiptData) {
      return NextResponse.json({ error: "No receipt found" }, { status: 404 });
    }

    const buffer = Buffer.from(tx.receiptData, "base64");

    return new Response(buffer, {
      headers: {
        "Content-Type": tx.receiptType || "application/octet-stream",
        "Content-Disposition": `inline; filename="${tx.receiptName || "receipt"}"`,
        "Cache-Control": "private, max-age=3600",
      },
    });
  } catch (error) {
    console.error("GET /api/transactions/[id]/receipt error:", error);
    return NextResponse.json({ error: "Failed to fetch receipt" }, { status: 500 });
  }
}

/** Delete the receipt */
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    await prisma.transaction.update({
      where: { id },
      data: {
        receiptSaved: false,
        receiptData: null,
        receiptName: null,
        receiptType: null,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("DELETE /api/transactions/[id]/receipt error:", error);
    return NextResponse.json({ error: "Failed to delete receipt" }, { status: 500 });
  }
}
