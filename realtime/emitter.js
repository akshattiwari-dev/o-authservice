import { getIO, recordFlowHistory } from "@/realtime/socketServer";

/**
 * Push one log entry into a live Playground session. Silently no-ops if
 * Socket.io isn't running (e.g. this route was hit outside the Playground
 * flow, with no flowId) or if the client already disconnected — real-time
 * logging is observability, not something that should ever break the
 * underlying OAuth request if it fails.
 *
 * Every event is also recorded into the per-flow history buffer (see
 * socketServer.js) BEFORE broadcasting, so even a socket that joins the
 * room a moment too late still receives it via the join-time replay.
 */
export function emitFlowEvent(flowId, event) {
  if (!flowId) return;

  const fullEvent = { ...event, timestamp: new Date().toISOString() };
  recordFlowHistory(flowId, fullEvent);

  const io = getIO();
  if (!io) return;

  io.to(`flow:${flowId}`).emit("flow-event", fullEvent);
}

/** Convenience wrapper for the common "step" shape used throughout the OAuth routes. */
export function emitStep(flowId, { step, title, detail, request, response, curl, status = "info" }) {
  emitFlowEvent(flowId, { step, title, detail, request, response, curl, status });
}
