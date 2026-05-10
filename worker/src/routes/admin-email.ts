import { Hono, type Context } from "hono";
import { z } from "zod";
import type { AppVariables, Env } from "../custom-env";
import { requireAdmin } from "../auth/middleware";
import { EmailSendError, sendEmail } from "../lib/email";

type AppType = { Bindings: Env; Variables: AppVariables };
type AppContext = Context<AppType>;

const testEmailBody = z.object({ to: z.string().email() }).strict();

const MESSAGES: Record<
  string,
  { zh: string; en: string }
> = {
  VALIDATION_BAD_TO: {
    zh: "收件人邮箱地址无效。",
    en: "Invalid recipient email address.",
  },
  VALIDATION_BAD_FROM: {
    zh: "发件人地址不在允许域名内 (@bangdream.org)。",
    en: "From address not in allowed domain (@bangdream.org).",
  },
  VALIDATION_EMPTY_BODY: {
    zh: "邮件正文为空,html 或 text 至少需一项。",
    en: "Email body empty; require html or text.",
  },
  DOMAIN_MISMATCH: {
    zh: "发件人域名与已验证域名不符。",
    en: "From domain does not match verified Resend domain.",
  },
  MISSING_API_KEY: {
    zh: "服务暂不可用 (API key 未配置)。",
    en: "Service unavailable (API key not configured).",
  },
  RESEND_4XX: {
    zh: "Resend 拒绝请求 (validation 错误)。",
    en: "Resend rejected request (validation error).",
  },
  RESEND_5XX: {
    zh: "Resend 服务异常,请稍后重试。",
    en: "Resend service error, retry later.",
  },
  RESEND_TIMEOUT: {
    zh: "Resend 请求超时。",
    en: "Resend request timed out.",
  },
  RESEND_RATE_LIMITED: {
    zh: "已超过 Resend 速率限制 (100/天 Free)。",
    en: "Resend rate limit exceeded (100/day Free tier).",
  },
  RESEND_UNAUTHORIZED: {
    zh: "Resend API key 无效或已撤销。",
    en: "Resend API key invalid or revoked.",
  },
  NETWORK_ERROR: {
    zh: "网络异常,无法连接 Resend。",
    en: "Network error, cannot reach Resend.",
  },
  UNKNOWN: {
    zh: "未知错误,请查日志。",
    en: "Unknown error, check logs.",
  },
};

function setNoStore(c: AppContext): void {
  c.header("Cache-Control", "no-store");
  c.header("Vary", "Origin");
}

function badRequest(c: AppContext, detail: unknown): Response {
  setNoStore(c);
  return c.json({ error: "bad_request", detail }, 400);
}

function emailErrorResponse(c: AppContext, err: EmailSendError): Response {
  setNoStore(c);
  const msg = MESSAGES[err.code] ?? MESSAGES.UNKNOWN;
  const payload: {
    error: "email_send_failed";
    code: string;
    status: number;
    requestId?: string;
    message_zh: string;
    message_en: string;
  } = {
    error: "email_send_failed",
    code: err.code,
    status: err.resendStatus ?? err.status,
    message_zh: msg.zh,
    message_en: msg.en,
  };
  if (err.requestId) payload.requestId = err.requestId;
  return c.json(payload, err.status as 400 | 502 | 504);
}

export function buildAdminEmailRoutes() {
  const router = new Hono<AppType>();
  router.use("*", requireAdmin);

  router.post("/test", async (c) => {
    let raw: unknown;
    try {
      raw = await c.req.json();
    } catch {
      return badRequest(c, "invalid_json");
    }
    const parsed = testEmailBody.safeParse(raw);
    if (!parsed.success) {
      return badRequest(c, parsed.error.flatten());
    }
    const user = c.get("user");
    const sentAt = new Date().toISOString();
    try {
      const result = await sendEmail(c.env, {
        to: parsed.data.to,
        subject: "[bangdream.org] Test email",
        html: `<p>This is a test email from bangdream.org admin panel.</p><p>Sent at ${sentAt}.</p>`,
        text: `This is a test email from bangdream.org admin panel.\nSent at ${sentAt}.`,
        tags: [
          { name: "kind", value: "test" },
          { name: "admin_user", value: user.github_login },
        ],
        actor: user.github_login,
        cfRequestId: c.req.header("cf-ray") ?? undefined,
      });
      setNoStore(c);
      return c.json({
        messageId: result.messageId,
        to: parsed.data.to,
        sent_at: sentAt,
      });
    } catch (err) {
      if (err instanceof EmailSendError) {
        return emailErrorResponse(c, err);
      }
      console.error("worker_error", {
        route: "/api/admin/email/test",
        err: err instanceof Error ? err.message : String(err),
      });
      setNoStore(c);
      return c.json({ error: "internal_error" }, 500);
    }
  });

  return router;
}
