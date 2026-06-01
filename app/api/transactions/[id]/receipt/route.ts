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
      const html = `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><title>No Receipt</title>
<style>body{font-family:system-ui,sans-serif;display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0;background:#09090B;color:#A1A1AA}
.box{text-align:center;padding:2rem;border:1px solid #27272A;border-radius:12px;max-width:400px}
h2{color:#FAFAFA;margin-bottom:.5rem}p{margin:.5rem 0;font-size:.875rem}</style></head>
<body><div class="box"><h2>No Receipt File</h2>
<p>No receipt file has been uploaded for this transaction.</p>
<p>The transaction was marked as &ldquo;receipt saved&rdquo; but no file was attached.</p>
<p style="margin-top:1.5rem"><a href="javascript:window.close()" style="color:#E8501A">Close this tab</a></p>
</div></body></html>`;
      return new Response(html, {
        status: 404,
        headers: { "Content-Type": "text/html; charset=utf-8" },
      });
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
