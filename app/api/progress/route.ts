import { NextResponse } from "next/server";
import {
  readProgressState,
  recordLineResult,
  resetProgressState,
} from "@/lib/server/progress-store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function count(value: unknown): number | null {
  if (typeof value !== "number" || !Number.isInteger(value)) return null;
  if (value < 0 || value > 1000) return null;
  return value;
}

export async function GET() {
  try {
    const state = await readProgressState();
    return NextResponse.json(state, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) {
    console.warn("Progress API read failed:", error);
    return NextResponse.json(
      { error: "Could not read the progress file." },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  if (!isRecord(body)) {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  try {
    if (body.action === "reset") {
      return NextResponse.json(await resetProgressState(), {
        headers: { "Cache-Control": "no-store" },
      });
    }

    if (body.action === "record") {
      const lineId = body.lineId;
      const mistakes = count(body.mistakes);
      const hints = count(body.hints);

      if (
        typeof lineId !== "string" ||
        lineId.length === 0 ||
        lineId.length > 240 ||
        mistakes === null ||
        hints === null
      ) {
        return NextResponse.json(
          { error: "A valid lineId, mistakes and hints are required." },
          { status: 400 },
        );
      }

      const saved = await recordLineResult(lineId, { mistakes, hints });
      return NextResponse.json(saved, {
        headers: { "Cache-Control": "no-store" },
      });
    }

    return NextResponse.json(
      { error: "Unknown action. Use 'record' or 'reset'." },
      { status: 400 },
    );
  } catch (error) {
    console.warn("Progress API write failed:", error);
    return NextResponse.json(
      { error: "Could not save progress." },
      { status: 500 },
    );
  }
}
