import { NextResponse } from "next/server";
import { register } from "@libs/observability";

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const metrics = await register.metrics();
    return new NextResponse(metrics, {
      headers: {
        "Content-Type": register.contentType,
      },
    });
  } catch (err) {
    return new NextResponse((err as Error).message, { status: 500 });
  }
}
