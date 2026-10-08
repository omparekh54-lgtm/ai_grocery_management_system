import { NextRequest } from "next/server";
export const runtime = "nodejs";
export const maxDuration = 60;
async function proxy(
  req: NextRequest,
  { params }: { params: Promise<{ path: string[] }> },
) {
  const { path } = await params;
  const origin = req.headers.get("origin");
  if (origin) {
    try {
      if (new URL(origin).host !== req.headers.get("host"))
        return Response.json(
          { detail: "Please use this app to make updates." },
          { status: 403 },
        );
    } catch {
      return Response.json(
        { detail: "Invalid request origin." },
        { status: 403 },
      );
    }
  }
  const base = process.env.BACKEND_URL || "http://127.0.0.1:8000";
  const url = new URL(
    path.map(encodeURIComponent).join("/"),
    base.endsWith("/") ? base : base + "/",
  );
  url.search = req.nextUrl.search;
  let body: Uint8Array | undefined;
  if (!["GET", "HEAD"].includes(req.method)) {
    if (Number(req.headers.get("content-length")) > 4000000)
      return Response.json({ detail: "Request too large." }, { status: 413 });
    body = new Uint8Array(await req.arrayBuffer());
    if (body.length > 4000000)
      return Response.json({ detail: "Request too large." }, { status: 413 });
  }
  try {
    const headers: Record<string, string> = {
      "Content-Type": req.headers.get("content-type") || "application/json",
    };
    if (req.headers.get("cookie")) headers.cookie = req.headers.get("cookie")!;
    // No user-provided forwarding or credential headers are trusted.
    const upstream = await fetch(url, {
      method: req.method,
      headers,
      body: body as BodyInit | undefined,
      cache: "no-store",
      redirect: "manual",
      signal: AbortSignal.timeout(55000),
    });
    const result = new Response(await upstream.arrayBuffer(), {
      status: upstream.status,
      headers: {
        "Content-Type":
          upstream.headers.get("content-type") || "application/json",
        "Cache-Control": "no-store",
      },
    });
    for (const cookie of upstream.headers.getSetCookie())
      result.headers.append("Set-Cookie", cookie);
    return result;
  } catch {
    return Response.json(
      {
        detail:
          "The kitchen service is unavailable. Check that the backend is running.",
      },
      { status: 503 },
    );
  }
}
export { proxy as GET, proxy as POST, proxy as PATCH };
