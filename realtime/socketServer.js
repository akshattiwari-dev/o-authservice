const { Server } = require("socket.io");
const { getToken } = require("next-auth/jwt");

// Per-flow event history, so a socket that joins a room after some events
// already fired (a real race: the popup can redirect and hit the server
// faster than the main tab's socket finishes its connect handshake) still
// gets the full timeline instead of silently missing early steps.
// Capped and time-boxed so this never grows unbounded across a long
// server lifetime full of playground sessions.
const FLOW_HISTORY_MAX_EVENTS = 50;
const FLOW_HISTORY_TTL_MS = 30 * 60_000; // 30 minutes

const flowHistories = new Map(); // flowId -> { events: [], lastActivity: number, ownerUserId: string|null }

function recordHistory(flowId, event) {
  if (!flowId) return;
  const entry = flowHistories.get(flowId) || { events: [], lastActivity: Date.now(), ownerUserId: null };
  entry.events.push(event);
  if (entry.events.length > FLOW_HISTORY_MAX_EVENTS) entry.events.shift();
  entry.lastActivity = Date.now();
  flowHistories.set(flowId, entry);
}

function getHistory(flowId) {
  return flowHistories.get(flowId)?.events || [];
}

setInterval(() => {
  const now = Date.now();
  for (const [flowId, entry] of flowHistories) {
    if (now - entry.lastActivity > FLOW_HISTORY_TTL_MS) flowHistories.delete(flowId);
  }
}, 60_000).unref?.();

/**
 * Socket.io is stashed on `global` because in dev mode Next.js may reload
 * route-handler modules, but `server.js` (which calls initSocketServer
 * once) keeps running — this lets any API route grab the same live
 * instance via getIO() without re-attaching a second server to the port.
 */
function initSocketServer(httpServer) {
  if (global.__oauthIo) return global.__oauthIo;

  const io = new Server(httpServer, {
    path: "/socket.io",
    cors: { origin: process.env.NEXTAUTH_URL || "*" },
  });

  io.on("connection", (socket) => {
    // A2/A6: previously any socket, authenticated or not, could join('flow:'
    // + anything) purely by guessing/knowing a flowId — no proof the
    // caller was ever actually part of that flow. We now require a valid
    // NextAuth session on the underlying handshake request AND bind each
    // flowId to whichever authenticated user joins it first — every later
    // join for that same flowId must come from that same user, or it's
    // rejected. The flowId itself is generated client-side (uuid v4) before
    // any server call exists to "create" it as a resource, so first-join
    // is the earliest point a server can actually attach an owner to it.
    //
    // Residual risk (documented, not eliminated): between flow creation
    // (client generates the uuid) and the first join, there's a brief
    // window where no owner is bound yet — if two different authenticated
    // users somehow raced to join the exact same flowId in that window,
    // whichever arrives first wins ownership. This requires guessing a
    // 122-bit random UUID inside a race measured in milliseconds, which is
    // not a practically exploitable attack; closing it fully would need
    // the flowId to be minted server-side (e.g. returned from an
    // authenticated "start flow" API call) rather than client-generated,
    // which is a larger change out of scope for this pass.
    socket.on("join-flow", async (flowId) => {
      if (typeof flowId !== "string" || flowId.length === 0 || flowId.length >= 100) return;

      let userId;
      try {
        const token = await getToken({ req: socket.request, secret: process.env.NEXTAUTH_SECRET });
        if (!token?.id) {
          socket.emit("flow-error", { message: "Sign in required to join this flow." });
          return;
        }
        userId = token.id;
      } catch {
        socket.emit("flow-error", { message: "Sign in required to join this flow." });
        return;
      }

      const entry = flowHistories.get(flowId);
      if (!entry) {
        // First join for this flowId — claim ownership.
        flowHistories.set(flowId, { events: [], lastActivity: Date.now(), ownerUserId: userId });
      } else if (entry.ownerUserId && entry.ownerUserId !== userId) {
        socket.emit("flow-error", { message: "This flow belongs to a different session." });
        return;
      } else if (!entry.ownerUserId) {
        // Events were recorded before any socket joined (e.g. server-side
        // emitStep fired first) — claim it for the first joiner now.
        entry.ownerUserId = userId;
      }

      socket.join(`flow:${flowId}`);
      socket.emit("flow-history", getHistory(flowId));
    });
  });

  global.__oauthIo = io;
  global.__oauthRecordHistory = recordHistory;
  return io;
}

function getIO() {
  return global.__oauthIo || null;
}

function recordFlowHistory(flowId, event) {
  if (global.__oauthRecordHistory) global.__oauthRecordHistory(flowId, event);
}

module.exports = { initSocketServer, getIO, recordFlowHistory };
