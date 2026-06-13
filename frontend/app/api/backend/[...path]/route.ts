import { NextRequest, NextResponse } from "next/server";

const configuredBackend = process.env.BACKEND_API_BASE_URL || process.env.NEXT_PUBLIC_API_BASE_URL;

function getBackendCandidates() {
  const candidates = new Set<string>();
  if (configuredBackend) {
    candidates.add(configuredBackend.replace(/\/$/, ""));
  }
  if (!process.env.VERCEL) {
    candidates.add("http://127.0.0.1:8000");
    candidates.add("http://localhost:8000");
  }
  return [...candidates];
}

async function proxy(request: NextRequest, params: { path: string[] }) {
  const suffix = params.path.join("/");
  const query = request.nextUrl.search || "";
  const headers = new Headers();
  const contentType = request.headers.get("content-type");
  const authorization = request.headers.get("authorization");
  const accept = request.headers.get("accept");

  if (contentType) headers.set("content-type", contentType);
  if (authorization) headers.set("authorization", authorization);
  if (accept) headers.set("accept", accept);

  const rawBody = request.method === "GET" || request.method === "HEAD" ? undefined : await request.text();
  let lastError: unknown = null;
  const backendCandidates = getBackendCandidates();

  if (backendCandidates.length === 0) {
    return NextResponse.json(
      { detail: "Backend API URL is not configured. Set BACKEND_API_BASE_URL in the frontend deployment." },
      { status: 503 },
    );
  }

  for (const backend of backendCandidates) {
    try {
      const response = await fetch(`${backend}/${suffix}${query}`, {
        method: request.method,
        headers,
        body: rawBody,
        cache: "no-store",
      });

      const text = await response.text();
      return new NextResponse(text, {
        status: response.status,
        headers: {
          "content-type": response.headers.get("content-type") || "application/json",
        },
      });
    } catch (error) {
      lastError = error;
    }
  }

  const detail = lastError instanceof Error ? lastError.message : "Backend unavailable";
  return NextResponse.json({ detail: detail || "Backend unavailable" }, { status: 503 });
}

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ path: string[] }> },
) {
  return proxy(request, await context.params);
}

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ path: string[] }> },
) {
  return proxy(request, await context.params);
}

export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ path: string[] }> },
) {
  return proxy(request, await context.params);
}

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ path: string[] }> },
) {
  return proxy(request, await context.params);
}
