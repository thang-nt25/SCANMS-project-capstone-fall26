import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { extname, join, normalize } from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL(".", import.meta.url));
const port = Number(process.env.PORT || 4173);
const types = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".mp4": "video/mp4",
  ".svg": "image/svg+xml",
  ".webp": "image/webp",
};

createServer(async (request, response) => {
  try {
    const pathname = decodeURIComponent(new URL(request.url, `http://${request.headers.host}`).pathname);
    const relative = pathname === "/" ? "index.html" : pathname.slice(1);
    const resolved = normalize(join(root, relative));
    if (!resolved.startsWith(root)) throw new Error("Invalid path");
    const body = await readFile(resolved);
    response.writeHead(200, {
      "Content-Type": types[extname(resolved)] || "application/octet-stream",
      "Cache-Control": "no-store, no-cache, must-revalidate",
    });
    response.end(body);
  } catch {
    response.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
    response.end("Không tìm thấy tệp.");
  }
}).listen(port, "127.0.0.1", () => {
  console.log(`SCANMS prototype: http://127.0.0.1:${port}`);
});
