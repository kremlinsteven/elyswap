import { NextResponse } from "next/server";
import { rollupState } from "@/lib/server/orbit";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/* The canonical bridge's state on HyperEVM: latest confirmed assertion, pending ones, confirm period. Shared, 60 s. */
export async function GET() {
  try {
    const s = await rollupState();
    return NextResponse.json(s, { headers: { "cache-control": "public, s-maxage=30, stale-while-revalidate=60" } });
  } catch {
    return NextResponse.json({ error: "The rollup on HyperEVM could not be read right now." }, { status: 503, headers: { "cache-control": "no-store" } });
  }
}
