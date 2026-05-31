import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  const host = request.headers.get("host") || "";
  if (host.startsWith("127.0.0.1:3000")) {
    const url = request.nextUrl.clone();
    url.protocol = "http:";
    url.hostname = "localhost";
    url.port = "3000";
    return NextResponse.redirect(url, 308);
  }

  return NextResponse.next();
}

export const config = {
  matcher: "/:path*",
};
