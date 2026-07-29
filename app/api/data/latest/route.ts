import { NextResponse } from "next/server";
import { getLatestSnapshot } from "@/lib/api";

export async function GET() {
  const data = await getLatestSnapshot();
  return NextResponse.json(data);
}
