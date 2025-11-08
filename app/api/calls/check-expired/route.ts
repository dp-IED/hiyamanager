import { checkAndHandleExpiredCalls } from "@/lib/db/queries";
import { NextResponse } from "next/server";

export async function POST() {
  try {
    await checkAndHandleExpiredCalls();
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to check expired calls:', error);
    return NextResponse.json({ error: 'Failed to check expired calls' }, { status: 500 });
  }
}

