import { createServer } from "node:http";
import { createReadStream, existsSync, statSync } from "node:fs";
import { extname, join, normalize, resolve } from "node:path";
import { Readable } from "node:stream";
import app from "./dist/server/server.js";

const host = process.env.HOST || "0.0.0.0";
const port = Number(process.env.PORT || 3000);
const publicRoot = resolve("dist/client");
const mime = {
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json",
  ".ico": "image/x-icon",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".svg": "image/svg+xml",
  ".webp": "image/webp",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
};

createServer(async (incoming, outgoing) => {
  try {
    const url = new URL(incoming.url || "/", `http://${incoming.headers.host || "localhost"}`);
    const candidate = resolve(join(publicRoot, normalize(decodeURIComponent(url.pathname))));
    if (
      (incoming.method === "GET" || incoming.method === "HEAD") &&
      candidate.startsWith(publicRoot) &&
      existsSync(candidate) &&
      statSync(candidate).isFile()
    ) {
      outgoing.statusCode = 200;
      outgoing.setHeader("Content-Type", mime[extname(candidate)] || "application/octet-stream");
      outgoing.setHeader(
        "Cache-Control",
        url.pathname.startsWith("/assets/")
          ? "public, max-age=31536000, immutable"
          : "public, max-age=3600",
      );
      if (incoming.method === "HEAD") return outgoing.end();
      return createReadStream(candidate).pipe(outgoing);
    }

    const init = { method: incoming.method, headers: incoming.headers };
    if (incoming.method !== "GET" && incoming.method !== "HEAD") {
      init.body = Readable.toWeb(incoming);
      init.duplex = "half";
    }
    const response = await app.fetch(new Request(url, init));
    outgoing.statusCode = response.status;
    for (const [key, value] of response.headers) outgoing.setHeader(key, value);
    if (!response.body) return outgoing.end();
    Readable.fromWeb(response.body).pipe(outgoing);
  } catch (error) {
    console.error(error);
    outgoing.statusCode = 500;
    outgoing.end("Internal Server Error");
  }
}).listen(port, host, () => console.log(`OmniSpace frontend listening on http://${host}:${port}`));
