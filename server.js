/**
 * Socket.io needs a persistent HTTP server to attach to — Next.js API
 * routes alone (serverless-style, request/response per call) can't hold a
 * long-lived WebSocket connection open. This file is the actual process
 * entry point (`npm run dev` / `npm start` both run `node server.js`
 * instead of the default `next dev` / `next start`), and it does two
 * things: boots Next's request handler as usual, and attaches Socket.io
 * to the same underlying HTTP server so both share one port.
 */
require("dotenv").config();


const { createServer } = require("http");
const { parse } = require("url");
const next = require("next");
const { initSocketServer } = require("./realtime/socketServer");

// Fail fast on missing config rather than booting successfully and only
// discovering the problem later (e.g. the first sign-in or the first token
// sign, at which point the failure is confusing and request-scoped).
const REQUIRED_ENV_VARS = [
  "DATABASE_URL",
  "NEXTAUTH_SECRET",
  "NEXTAUTH_URL",
  "OAUTH_PRIVATE_KEY",
  "OAUTH_PUBLIC_KEY",
];
const missing = REQUIRED_ENV_VARS.filter((key) => !process.env[key]);
if (missing.length > 0) {
  console.error(
    `\nMissing required environment variable(s): ${missing.join(", ")}\n` +
      "Copy .env.example to .env and fill these in (OAUTH_PRIVATE_KEY / " +
      "OAUTH_PUBLIC_KEY can be generated with `npm run keys:generate`).\n"
  );
  process.exit(1);
}

const dev = process.env.NODE_ENV !== "production";
const hostname = "localhost";
const port = Number(process.env.PORT || process.env.SOCKET_PORT || 3000);

const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

app.prepare().then(() => {
  const httpServer = createServer((req, res) => {
    const parsedUrl = parse(req.url, true);
    handle(req, res, parsedUrl);
  });

  initSocketServer(httpServer);

  httpServer.listen(port, () => {
    console.log(`> o-auth platform ready on http://${hostname}:${port}`);
    console.log(`> Socket.io listening on the same port at /socket.io`);
  });
});
