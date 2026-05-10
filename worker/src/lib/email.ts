import type { Env } from "../custom-env";

export type EmailSendErrorCode =
  | "VALIDATION_BAD_TO"
  | "VALIDATION_EMPTY_BODY"
  | "VALIDATION_BAD_FROM"
  | "DOMAIN_MISMATCH"
  | "MISSING_API_KEY"
  | "RESEND_4XX"
  | "RESEND_5XX"
  | "RESEND_TIMEOUT"
  | "RESEND_RATE_LIMITED"
  | "RESEND_UNAUTHORIZED"
  | "NETWORK_ERROR"
  | "UNKNOWN";

export interface EmailSendOpts {
  to: string | string[];
  subject: string;
  html?: string;
  text?: string;
  from?: string;
  replyTo?: string;
  tags?: { name: string; value: string }[];
  actor?: string;
  timeoutMs?: number;
  cfRequestId?: string;
}

export interface EmailSendResult {
  messageId: string;
  resendRequestId: string | null;
  durationMs: number;
}

interface EmailSendErrorInit {
  status: number;
  resendStatus?: number | null;
  requestId?: string | null;
  resendCode?: string | null;
  cause?: unknown;
}

export class EmailSendError extends Error {
  public readonly code: EmailSendErrorCode;
  public readonly status: number;
  public readonly resendStatus: number | null;
  public readonly requestId: string | null;
  public readonly resendCode: string | null;

  constructor(code: EmailSendErrorCode, init: EmailSendErrorInit) {
    super(`EmailSendError(${code}): status=${init.status}`);
    this.name = "EmailSendError";
    this.code = code;
    this.status = init.status;
    this.resendStatus = init.resendStatus ?? null;
    this.requestId = init.requestId ?? null;
    this.resendCode = init.resendCode ?? null;
    if (init.cause !== undefined) {
      (this as { cause?: unknown }).cause = init.cause;
    }
  }
}

const RESEND_URL = "https://api.resend.com/emails";
const ALLOWED_DOMAIN = "@bangdream.org";
const DEFAULT_FROM = "contact@bangdream.org";
const DEFAULT_TIMEOUT_MS = 8000;
const SUBJECT_MAX_LEN = 200;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

async function hashHex16(input: string): Promise<string> {
  const buf = new TextEncoder().encode(input);
  const digest = await crypto.subtle.digest("SHA-256", buf);
  const hex = Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
  return hex.slice(0, 16);
}

function normalizeTo(to: string | string[]): string[] {
  if (Array.isArray(to)) {
    return to.map((s) => (typeof s === "string" ? s.trim() : ""));
  }
  return [typeof to === "string" ? to.trim() : ""];
}

interface ResendBodyShape {
  from: string;
  to: string[];
  subject: string;
  html?: string;
  text?: string;
  reply_to?: string;
  tags?: { name: string; value: string }[];
}

function mapResendStatus(status: number): {
  code: EmailSendErrorCode;
  routeStatus: number;
} {
  if (status === 401 || status === 403) {
    return { code: "RESEND_UNAUTHORIZED", routeStatus: 502 };
  }
  if (status === 429) {
    return { code: "RESEND_RATE_LIMITED", routeStatus: 502 };
  }
  if (status >= 400 && status < 500) {
    return { code: "RESEND_4XX", routeStatus: 502 };
  }
  if (status >= 500 && status < 600) {
    return { code: "RESEND_5XX", routeStatus: 502 };
  }
  return { code: "UNKNOWN", routeStatus: 502 };
}

interface LogPayloadBase {
  ts: string;
  level: "info" | "warn" | "error";
  op: "email.send";
  to_hash: string;
  subject_hash: string;
  from: string;
  actor: string;
  status: "ok" | "error";
  duration_ms: number;
  cf_request_id?: string;
}

interface LogPayloadOk extends LogPayloadBase {
  resend_message_id: string;
  resend_request_id?: string;
}

interface LogPayloadErr extends LogPayloadBase {
  error_code: EmailSendErrorCode;
  resend_request_id?: string;
  resend_code?: string;
  http_status?: number;
}

/**
 * Send a transactional email via Resend REST API.
 *
 * Tag/charset cardinality is trusted to the caller (Resend caps at 10 tags
 * with `[a-zA-Z0-9_-]` chars ≤ 256). Wrapper does not validate.
 *
 * Throws `EmailSendError` for recoverable failures (validation, Resend non-2xx,
 * network). Throws plain `Error` for programmer errors (empty / overlong subject).
 */
export async function sendEmail(
  env: Env,
  opts: EmailSendOpts,
): Promise<EmailSendResult> {
  const start = Date.now();
  const actor = opts.actor ?? "system";

  if (typeof opts.subject !== "string" || opts.subject.trim().length === 0) {
    throw new Error("sendEmail: subject required");
  }
  if (opts.subject.length > SUBJECT_MAX_LEN) {
    throw new Error("sendEmail: subject too long");
  }

  const subjectHashPromise = hashHex16(opts.subject);

  if (!env.RESEND_API_KEY) {
    const subject_hash = await subjectHashPromise;
    const to_hash = await hashHex16(normalizeTo(opts.to).join(",").toLowerCase());
    const fromForLog = (opts.from ?? env.EMAIL_FROM_DEFAULT ?? DEFAULT_FROM).toLowerCase();
    logFailure({
      ts: new Date().toISOString(),
      level: "warn",
      op: "email.send",
      to_hash,
      subject_hash,
      from: fromForLog,
      actor,
      status: "error",
      duration_ms: Date.now() - start,
      cf_request_id: opts.cfRequestId,
      error_code: "MISSING_API_KEY",
    });
    throw new EmailSendError("MISSING_API_KEY", { status: 502 });
  }

  const toList = normalizeTo(opts.to).filter((s) => s.length > 0);
  const rawToList = normalizeTo(opts.to);
  if (toList.length === 0 || toList.length !== rawToList.length) {
    await logValidationFail(
      "VALIDATION_BAD_TO",
      opts,
      env,
      actor,
      start,
      subjectHashPromise,
    );
    throw new EmailSendError("VALIDATION_BAD_TO", { status: 400 });
  }
  for (const addr of toList) {
    if (!EMAIL_REGEX.test(addr)) {
      await logValidationFail(
        "VALIDATION_BAD_TO",
        opts,
        env,
        actor,
        start,
        subjectHashPromise,
      );
      throw new EmailSendError("VALIDATION_BAD_TO", { status: 400 });
    }
  }

  const htmlBody = typeof opts.html === "string" ? opts.html.trim() : "";
  const textBody = typeof opts.text === "string" ? opts.text.trim() : "";
  if (htmlBody.length === 0 && textBody.length === 0) {
    await logValidationFail(
      "VALIDATION_EMPTY_BODY",
      opts,
      env,
      actor,
      start,
      subjectHashPromise,
    );
    throw new EmailSendError("VALIDATION_EMPTY_BODY", { status: 400 });
  }

  const resolvedFrom = (opts.from ?? env.EMAIL_FROM_DEFAULT ?? DEFAULT_FROM).trim();
  if (!EMAIL_REGEX.test(resolvedFrom)) {
    await logValidationFail(
      "VALIDATION_BAD_FROM",
      opts,
      env,
      actor,
      start,
      subjectHashPromise,
      resolvedFrom,
    );
    throw new EmailSendError("VALIDATION_BAD_FROM", { status: 400 });
  }
  if (!resolvedFrom.toLowerCase().endsWith(ALLOWED_DOMAIN)) {
    await logValidationFail(
      "DOMAIN_MISMATCH",
      opts,
      env,
      actor,
      start,
      subjectHashPromise,
      resolvedFrom,
    );
    throw new EmailSendError("DOMAIN_MISMATCH", { status: 400 });
  }

  const body: ResendBodyShape = {
    from: resolvedFrom,
    to: toList,
    subject: opts.subject,
  };
  if (htmlBody.length > 0 && typeof opts.html === "string") body.html = opts.html;
  if (textBody.length > 0 && typeof opts.text === "string") body.text = opts.text;
  if (opts.replyTo) body.reply_to = opts.replyTo;
  if (opts.tags) body.tags = opts.tags;

  const to_hash = await hashHex16(toList.join(",").toLowerCase());
  const subject_hash = await subjectHashPromise;
  const fromForLog = resolvedFrom.toLowerCase();

  const controller = new AbortController();
  const timer = setTimeout(
    () => controller.abort(),
    opts.timeoutMs ?? DEFAULT_TIMEOUT_MS,
  );
  let res: Response | undefined;
  try {
    res = await fetch(RESEND_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${env.RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
  } catch (err) {
    clearTimeout(timer);
    const errName = (err as Error | undefined)?.name;
    const duration_ms = Date.now() - start;
    if (errName === "AbortError") {
      logFailure({
        ts: new Date().toISOString(),
        level: "error",
        op: "email.send",
        to_hash,
        subject_hash,
        from: fromForLog,
        actor,
        status: "error",
        duration_ms,
        cf_request_id: opts.cfRequestId,
        error_code: "RESEND_TIMEOUT",
      });
      throw new EmailSendError("RESEND_TIMEOUT", {
        status: 504,
        cause: err,
      });
    }
    logFailure({
      ts: new Date().toISOString(),
      level: "error",
      op: "email.send",
      to_hash,
      subject_hash,
      from: fromForLog,
      actor,
      status: "error",
      duration_ms,
      cf_request_id: opts.cfRequestId,
      error_code: "NETWORK_ERROR",
    });
    throw new EmailSendError("NETWORK_ERROR", {
      status: 502,
      cause: err,
    });
  }
  clearTimeout(timer);

  const requestId = res.headers.get("X-Request-Id") ?? null;

  if (res.status === 200) {
    let parsed: { id?: unknown } = {};
    try {
      parsed = (await res.json()) as { id?: unknown };
    } catch {
      parsed = {};
    }
    const messageId = typeof parsed.id === "string" ? parsed.id : "";
    const duration_ms = Date.now() - start;
    const successPayload: LogPayloadOk = {
      ts: new Date().toISOString(),
      level: "info",
      op: "email.send",
      to_hash,
      subject_hash,
      from: fromForLog,
      actor,
      status: "ok",
      duration_ms,
      resend_message_id: messageId,
    };
    if (requestId) successPayload.resend_request_id = requestId;
    if (opts.cfRequestId) successPayload.cf_request_id = opts.cfRequestId;
    console.log("email_send", successPayload);
    return { messageId, resendRequestId: requestId, durationMs: duration_ms };
  }

  // Non-2xx response.
  let resendCode: string | null = null;
  try {
    const body = (await res.json()) as { code?: unknown };
    if (typeof body.code === "string") resendCode = body.code;
  } catch {
    resendCode = null;
  }
  const { code, routeStatus } = mapResendStatus(res.status);
  const duration_ms = Date.now() - start;
  const failPayload: LogPayloadErr = {
    ts: new Date().toISOString(),
    level: "error",
    op: "email.send",
    to_hash,
    subject_hash,
    from: fromForLog,
    actor,
    status: "error",
    duration_ms,
    error_code: code,
    http_status: res.status,
  };
  if (requestId) failPayload.resend_request_id = requestId;
  if (resendCode) failPayload.resend_code = resendCode;
  if (opts.cfRequestId) failPayload.cf_request_id = opts.cfRequestId;
  console.error("email_send", failPayload);
  throw new EmailSendError(code, {
    status: routeStatus,
    resendStatus: res.status,
    requestId,
    resendCode,
  });
}

async function logValidationFail(
  errCode: EmailSendErrorCode,
  opts: EmailSendOpts,
  env: Env,
  actor: string,
  start: number,
  subjectHashPromise: Promise<string>,
  resolvedFrom?: string,
): Promise<void> {
  const subject_hash = await subjectHashPromise;
  const to_hash = await hashHex16(normalizeTo(opts.to).join(",").toLowerCase());
  const fromForLog = (
    resolvedFrom ??
    opts.from ??
    env.EMAIL_FROM_DEFAULT ??
    DEFAULT_FROM
  ).toLowerCase();
  const payload: LogPayloadErr = {
    ts: new Date().toISOString(),
    level: "warn",
    op: "email.send",
    to_hash,
    subject_hash,
    from: fromForLog,
    actor,
    status: "error",
    duration_ms: Date.now() - start,
    error_code: errCode,
  };
  if (opts.cfRequestId) payload.cf_request_id = opts.cfRequestId;
  console.warn("email_send", payload);
}

function logFailure(payload: LogPayloadErr): void {
  if (payload.level === "warn") {
    console.warn("email_send", payload);
  } else {
    console.error("email_send", payload);
  }
}
