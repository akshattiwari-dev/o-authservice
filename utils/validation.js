import { z } from "zod";

export const signUpSchema = z.object({
  name: z.string().min(2).max(80),
  email: z.string().email(),
  password: z.string().min(8).max(100),
});

export const signInSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export const forgotPasswordSchema = z.object({
  email: z.string().email(),
});

export const resetPasswordSchema = z.object({
  token: z.string().min(1),
  password: z.string().min(8).max(100),
});

// A3: in production, redirect URIs must be https except loopback
// (localhost/127.0.0.1), which is allowed over http for local development
// against a registered client. NODE_ENV is read here rather than passed in
// so every schema consumer gets the same rule for free.
const redirectUriSchema = z.string().url().superRefine((value, ctx) => {
  if (process.env.NODE_ENV !== "production") return;
  let url;
  try {
    url = new URL(value);
  } catch {
    return; // z.string().url() already flags this
  }
  const isLoopback = url.hostname === "localhost" || url.hostname === "127.0.0.1";
  if (url.protocol !== "https:" && !isLoopback) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: "redirect_uri must be https in production (loopback exempted)" });
  }
});

// A1: logoUrl is user-supplied and rendered as <img src> on the consent
// screen — reject non-http(s) schemes (e.g. javascript:) and require https
// in production, same reasoning as redirect_uri above.
const logoUrlSchema = z
  .string()
  .url()
  .superRefine((value, ctx) => {
    let url;
    try {
      url = new URL(value);
    } catch {
      return;
    }
    if (url.protocol !== "http:" && url.protocol !== "https:") {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "logoUrl must be an http(s) URL" });
      return;
    }
    if (process.env.NODE_ENV === "production" && url.protocol !== "https:") {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "logoUrl must be https in production" });
    }
  })
  .optional()
  .nullable();

export const createClientSchema = z.object({
  name: z.string().min(2).max(80),
  description: z.string().max(300).optional().nullable(),
  logoUrl: logoUrlSchema,
  redirectUris: z.array(redirectUriSchema).min(1).max(10),
  scopes: z.array(z.string()).min(1),
  isPublic: z.boolean().default(false),
});

export const updateClientSchema = createClientSchema.partial();

export const authorizeQuerySchema = z.object({
  response_type: z.literal("code"),
  client_id: z.string().min(1),
  redirect_uri: z.string().url(),
  scope: z.string().min(1),
  state: z.string().min(1),
  code_challenge: z.string().min(43).max(128).optional(),
  // "plain" is intentionally excluded — this server never accepts it (see oauth/pkce.js).
  code_challenge_method: z.enum(["S256"]).optional(),
  // Correlates this flow to a live Playground socket session, if any.
  playground_flow_id: z.string().optional(),
});

export const tokenRequestSchema = z.discriminatedUnion("grant_type", [
  z.object({
    grant_type: z.literal("authorization_code"),
    code: z.string().min(1),
    redirect_uri: z.string().url(),
    client_id: z.string().min(1),
    client_secret: z.string().optional(),
    code_verifier: z.string().min(43).max(128).optional(),
  }),
  z.object({
    grant_type: z.literal("refresh_token"),
    refresh_token: z.string().min(1),
    client_id: z.string().min(1),
    client_secret: z.string().optional(),
    scope: z.string().optional(),
  }),
  z.object({
    grant_type: z.literal("client_credentials"),
    client_id: z.string().min(1),
    client_secret: z.string().optional(),
    scope: z.string().optional(),
  }),
]);

export const introspectSchema = z.object({
  token: z.string().min(1),
  client_id: z.string().min(1),
  client_secret: z.string().optional(),
});

export const revokeSchema = z.object({
  token: z.string().min(1),
  token_type_hint: z.enum(["access_token", "refresh_token"]).optional(),
  client_id: z.string().min(1),
  client_secret: z.string().optional(),
});

export const createApiKeySchema = z.object({
  name: z.string().min(2).max(60),
});

export const chapterProgressSchema = z.object({
  chapterSlug: z.string().min(1),
  completed: z.boolean(),
});

export const chapterNoteSchema = z.object({
  chapterSlug: z.string().min(1),
  body: z.string().max(20000),
});

export const updateUserRoleSchema = z.object({
  userId: z.string().min(1),
  role: z.enum(["USER", "DEVELOPER", "ADMIN"]),
});
