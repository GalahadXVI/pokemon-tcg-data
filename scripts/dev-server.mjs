import http from "node:http";
import { createReadStream } from "node:fs";
import { promises as fs } from "node:fs";
import path from "node:path";

const root = process.cwd();
const port = Number.parseInt(process.env.PORT || "8000", 10);

const mime = new Map([
  [".html", "text/html; charset=utf-8"],
  [".js", "text/javascript; charset=utf-8"],
  [".mjs", "text/javascript; charset=utf-8"],
  [".json", "application/json; charset=utf-8"],
  [".css", "text/css; charset=utf-8"],
  [".svg", "image/svg+xml"],
  [".png", "image/png"],
  [".jpg", "image/jpeg"],
  [".jpeg", "image/jpeg"],
  [".gif", "image/gif"],
  [".ico", "image/x-icon"],
  [".txt", "text/plain; charset=utf-8"]
]);

function send(res, status, body, contentType = "text/plain; charset=utf-8") {
  res.writeHead(status, {
    "Content-Type": contentType,
    "Access-Control-Allow-Origin": "*",
    "Cache-Control": "no-store"
  });
  res.end(body);
}

function resolveRequestPath(urlValue) {
  const url = new URL(urlValue, "http://localhost");
  const decoded = decodeURIComponent(url.pathname);
  const fullPath = path.resolve(root, `.${decoded}`);
  if (!fullPath.startsWith(root)) return null;
  return fullPath;
}

async function resolveFilePath(inputPath) {
  try {
    const stat = await fs.stat(inputPath);
    if (stat.isDirectory()) {
      const indexPath = path.join(inputPath, "index.html");
      const indexStat = await fs.stat(indexPath);
      if (!indexStat.isFile()) return null;
      return { filePath: indexPath, size: indexStat.size };
    }
    if (!stat.isFile()) return null;
    return { filePath: inputPath, size: stat.size };
  } catch {
    return null;
  }
}

const server = http.createServer(async (req, res) => {
  const method = req.method || "GET";
  if (method !== "GET" && method !== "HEAD") {
    send(res, 405, "Method Not Allowed");
    return;
  }

  const requested = resolveRequestPath(req.url || "/");
  if (!requested) {
    send(res, 400, "Bad Request");
    return;
  }

  const file = await resolveFilePath(requested);
  if (!file) {
    send(res, 404, "Not Found");
    return;
  }

  const ext = path.extname(file.filePath).toLowerCase();
  const contentType = mime.get(ext) || "application/octet-stream";

  res.writeHead(200, {
    "Content-Type": contentType,
    "Content-Length": file.size,
    "Access-Control-Allow-Origin": "*",
    "Cache-Control": "no-store"
  });

  if (method === "HEAD") {
    res.end();
    return;
  }

  const stream = createReadStream(file.filePath);
  stream.on("error", () => send(res, 500, "Internal Server Error"));
  stream.pipe(res);
});

server.listen(port, "127.0.0.1", () => {
  console.log(`Pokemon TCG browser server running at http://127.0.0.1:${port}`);
  console.log(`Serving: ${root}`);
});
