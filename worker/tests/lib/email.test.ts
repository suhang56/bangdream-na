import { env } from "cloudflare:test";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { EmailSendError, sendEmail } from "../../src/lib/email";

function resendOk(id = "msg_abc123", requestId = "req_test001"): Response {
  return new Response(JSON.stringify({ id }), {
    status: 200,
    headers: {
      "X-Request-Id": requestId,
      "Content-Type": "application/json",
    },
  });
}

function resendErr(
  status: number,
  body: unknown = {},
  requestId = "req_test_err",
): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "X-Request-Id": requestId,
      "Content-Type": "application/json",
    },
  });
}

function resendErrPlain(status: number, requestId = "req_test_err"): Response {
  return new Response("<html>oops</html>", {
    status,
    headers: {
      "X-Request-Id": requestId,
      "Content-Type": "text/html",
    },
  });
}

beforeEach(() => {
  vi.restoreAllMocks();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("sendEmail - happy path", () => {
  it("1. returns {messageId, resendRequestId, durationMs} on Resend 200", async () => {
    const fetchSpy = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(resendOk("msg_xyz", "req_ok_1"));
    const result = await sendEmail(env, {
      to: "user@bangdream.org",
      subject: "hello",
      text: "body",
    });
    expect(result.messageId).toBe("msg_xyz");
    expect(result.resendRequestId).toBe("req_ok_1");
    expect(result.durationMs).toBeGreaterThanOrEqual(0);
    expect(fetchSpy).toHaveBeenCalledTimes(1);
  });

  it("2. POSTs to https://api.resend.com/emails with Bearer + JSON headers", async () => {
    const fetchSpy = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(resendOk());
    await sendEmail(env, {
      to: "user@bangdream.org",
      subject: "hello",
      text: "body",
    });
    const call = fetchSpy.mock.calls[0];
    expect(call[0]).toBe("https://api.resend.com/emails");
    const init = call[1] as RequestInit;
    expect(init.method).toBe("POST");
    const headers = init.headers as Record<string, string>;
    expect(headers.Authorization).toBe("Bearer test-resend-key");
    expect(headers["Content-Type"]).toBe("application/json");
  });

  it("3. body uses reply_to (snake_case, NOT replyTo) when caller passes replyTo", async () => {
    const fetchSpy = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(resendOk());
    await sendEmail(env, {
      to: "user@bangdream.org",
      subject: "hello",
      text: "body",
      replyTo: "ops@bangdream.org",
    });
    const init = fetchSpy.mock.calls[0][1] as RequestInit;
    const body = JSON.parse(init.body as string) as Record<string, unknown>;
    expect(Object.keys(body)).toContain("reply_to");
    expect(Object.keys(body)).not.toContain("replyTo");
    expect(body.reply_to).toBe("ops@bangdream.org");
  });

  it("4. default from = contact@bangdream.org when env override absent", async () => {
    const fetchSpy = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(resendOk());
    const slim = { ...env, EMAIL_FROM_DEFAULT: undefined } as typeof env;
    await sendEmail(slim, {
      to: "user@bangdream.org",
      subject: "hello",
      text: "body",
    });
    const init = fetchSpy.mock.calls[0][1] as RequestInit;
    const body = JSON.parse(init.body as string) as { from: string };
    expect(body.from).toBe("contact@bangdream.org");
  });

  it("5. env.EMAIL_FROM_DEFAULT overrides default when caller does not pass from", async () => {
    const fetchSpy = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(resendOk());
    const overridden = {
      ...env,
      EMAIL_FROM_DEFAULT: "ops@bangdream.org",
    } as typeof env;
    await sendEmail(overridden, {
      to: "user@bangdream.org",
      subject: "hello",
      text: "body",
    });
    const init = fetchSpy.mock.calls[0][1] as RequestInit;
    const body = JSON.parse(init.body as string) as { from: string };
    expect(body.from).toBe("ops@bangdream.org");
  });

  it("6. string and array `to` both serialize to array on wire", async () => {
    const fetchSpy = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValue(resendOk());

    await sendEmail(env, {
      to: "a@bangdream.org",
      subject: "s",
      text: "t",
    });
    let body = JSON.parse(
      fetchSpy.mock.calls[0][1]!.body as string,
    ) as { to: unknown };
    expect(Array.isArray(body.to)).toBe(true);
    expect(body.to).toEqual(["a@bangdream.org"]);

    await sendEmail(env, {
      to: ["a@bangdream.org", "b@bangdream.org"],
      subject: "s",
      text: "t",
    });
    body = JSON.parse(
      fetchSpy.mock.calls[1][1]!.body as string,
    ) as { to: unknown };
    expect(body.to).toEqual(["a@bangdream.org", "b@bangdream.org"]);
  });

  it("7. tags passed through verbatim; omitted from body when caller omits", async () => {
    const fetchSpy = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValue(resendOk());

    await sendEmail(env, {
      to: "u@bangdream.org",
      subject: "s",
      text: "t",
    });
    let body = JSON.parse(
      fetchSpy.mock.calls[0][1]!.body as string,
    ) as Record<string, unknown>;
    expect(body).not.toHaveProperty("tags");

    await sendEmail(env, {
      to: "u@bangdream.org",
      subject: "s",
      text: "t",
      tags: [{ name: "kind", value: "test" }],
    });
    body = JSON.parse(
      fetchSpy.mock.calls[1][1]!.body as string,
    ) as Record<string, unknown>;
    expect(body.tags).toEqual([{ name: "kind", value: "test" }]);
  });

  it("8. logs hashed to + subject; raw `to` does NOT appear in any log call", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(resendOk("mid_log"));
    const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    const RAW_TO = "leak-detector@bangdream.org";
    await sendEmail(env, {
      to: RAW_TO,
      subject: "subject-leak-detector",
      text: "body",
    });
    expect(logSpy).toHaveBeenCalled();
    const eventCall = logSpy.mock.calls.find((args) => args[0] === "email_send");
    expect(eventCall).toBeDefined();
    const payload = (eventCall as unknown[])[1] as Record<string, unknown>;
    expect(payload.to_hash).toMatch(/^[0-9a-f]{16}$/);
    expect(payload.subject_hash).toMatch(/^[0-9a-f]{16}$/);
    expect(payload.resend_message_id).toBe("mid_log");
    for (const call of logSpy.mock.calls) {
      const serialized = JSON.stringify(call);
      expect(serialized).not.toContain(RAW_TO);
      expect(serialized).not.toContain("subject-leak-detector");
    }
  });
});

describe("sendEmail - edge cases", () => {
  it("9. to: '' -> VALIDATION_BAD_TO (400); fetch NOT called", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    await expect(
      sendEmail(env, { to: "", subject: "s", text: "t" }),
    ).rejects.toMatchObject({
      code: "VALIDATION_BAD_TO",
      status: 400,
    });
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("10. to: [] -> VALIDATION_BAD_TO; fetch NOT called", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    await expect(
      sendEmail(env, { to: [], subject: "s", text: "t" }),
    ).rejects.toMatchObject({
      code: "VALIDATION_BAD_TO",
      status: 400,
    });
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("11. to: ['valid@x.com', ''] -> VALIDATION_BAD_TO (one empty member)", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    await expect(
      sendEmail(env, {
        to: ["valid@bangdream.org", ""],
        subject: "s",
        text: "t",
      }),
    ).rejects.toMatchObject({ code: "VALIDATION_BAD_TO", status: 400 });
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("12. to: 'not-an-email' -> VALIDATION_BAD_TO via regex", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    await expect(
      sendEmail(env, { to: "not-an-email", subject: "s", text: "t" }),
    ).rejects.toMatchObject({ code: "VALIDATION_BAD_TO", status: 400 });
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("13. neither html nor text -> VALIDATION_EMPTY_BODY; no fetch", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    await expect(
      sendEmail(env, { to: "u@bangdream.org", subject: "s" }),
    ).rejects.toMatchObject({ code: "VALIDATION_EMPTY_BODY", status: 400 });
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("14. html: '' AND text: '' -> VALIDATION_EMPTY_BODY", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    await expect(
      sendEmail(env, {
        to: "u@bangdream.org",
        subject: "s",
        html: "  ",
        text: "",
      }),
    ).rejects.toMatchObject({ code: "VALIDATION_EMPTY_BODY", status: 400 });
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("15. from: 'evil@example.com' -> DOMAIN_MISMATCH (400); no fetch", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    await expect(
      sendEmail(env, {
        to: "u@bangdream.org",
        subject: "s",
        text: "t",
        from: "evil@example.com",
      }),
    ).rejects.toMatchObject({ code: "DOMAIN_MISMATCH", status: 400 });
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("16. from: 'user@BANGDREAM.ORG' -> passes (case-insensitive); fetch called", async () => {
    const fetchSpy = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(resendOk());
    await sendEmail(env, {
      to: "u@bangdream.org",
      subject: "s",
      text: "t",
      from: "user@BANGDREAM.ORG",
    });
    expect(fetchSpy).toHaveBeenCalledOnce();
    const init = fetchSpy.mock.calls[0][1] as RequestInit;
    const body = JSON.parse(init.body as string) as { from: string };
    expect(body.from).toBe("user@BANGDREAM.ORG");
  });

  it("17. env.RESEND_API_KEY = '' -> MISSING_API_KEY (502); no fetch", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    const noKey = { ...env, RESEND_API_KEY: "" } as typeof env;
    await expect(
      sendEmail(noKey, { to: "u@bangdream.org", subject: "s", text: "t" }),
    ).rejects.toMatchObject({ code: "MISSING_API_KEY", status: 502 });
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("18. Resend 422 with body code -> RESEND_4XX, status 502 (route), resendStatus 422, resendCode preserved, requestId captured", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      resendErr(
        422,
        {
          name: "validation_error",
          message: "to invalid",
          code: "invalid_to_address",
        },
        "req_422_x",
      ),
    );
    try {
      await sendEmail(env, {
        to: "u@bangdream.org",
        subject: "s",
        text: "t",
      });
      throw new Error("expected to throw");
    } catch (err) {
      expect(err).toBeInstanceOf(EmailSendError);
      const e = err as EmailSendError;
      expect(e.code).toBe("RESEND_4XX");
      expect(e.status).toBe(502);
      expect(e.resendStatus).toBe(422);
      expect(e.resendCode).toBe("invalid_to_address");
      expect(e.requestId).toBe("req_422_x");
    }
  });

  it("19. Resend 422 with non-JSON body -> RESEND_4XX, resendCode null, no throw", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(resendErrPlain(422));
    await expect(
      sendEmail(env, { to: "u@bangdream.org", subject: "s", text: "t" }),
    ).rejects.toMatchObject({
      code: "RESEND_4XX",
      status: 502,
      resendStatus: 422,
      resendCode: null,
    });
  });

  it("20. Resend 503 -> RESEND_5XX, route status 502", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(resendErr(503));
    await expect(
      sendEmail(env, { to: "u@bangdream.org", subject: "s", text: "t" }),
    ).rejects.toMatchObject({
      code: "RESEND_5XX",
      status: 502,
      resendStatus: 503,
    });
  });

  it("21. Resend 429 -> RESEND_RATE_LIMITED", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(resendErr(429));
    await expect(
      sendEmail(env, { to: "u@bangdream.org", subject: "s", text: "t" }),
    ).rejects.toMatchObject({
      code: "RESEND_RATE_LIMITED",
      status: 502,
      resendStatus: 429,
    });
  });

  it("22. Resend 401 -> RESEND_UNAUTHORIZED", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(resendErr(401));
    await expect(
      sendEmail(env, { to: "u@bangdream.org", subject: "s", text: "t" }),
    ).rejects.toMatchObject({
      code: "RESEND_UNAUTHORIZED",
      status: 502,
      resendStatus: 401,
    });
  });

  it("23. Resend 403 -> RESEND_UNAUTHORIZED", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(resendErr(403));
    await expect(
      sendEmail(env, { to: "u@bangdream.org", subject: "s", text: "t" }),
    ).rejects.toMatchObject({
      code: "RESEND_UNAUTHORIZED",
      status: 502,
      resendStatus: 403,
    });
  });

  it("24. fetch rejects with TypeError -> NETWORK_ERROR, cause preserved", async () => {
    const netErr = new TypeError("network down");
    vi.spyOn(globalThis, "fetch").mockRejectedValueOnce(netErr);
    try {
      await sendEmail(env, {
        to: "u@bangdream.org",
        subject: "s",
        text: "t",
      });
      throw new Error("expected to throw");
    } catch (err) {
      expect(err).toBeInstanceOf(EmailSendError);
      const e = err as EmailSendError;
      expect(e.code).toBe("NETWORK_ERROR");
      expect(e.status).toBe(502);
      expect((e as unknown as { cause?: unknown }).cause).toBe(netErr);
    }
  });

  it("25. AbortError via timeoutMs -> RESEND_TIMEOUT (504)", async () => {
    vi.spyOn(globalThis, "fetch").mockImplementationOnce(
      (_url, init) =>
        new Promise((_, reject) => {
          const signal = (init as RequestInit | undefined)?.signal as
            | AbortSignal
            | undefined;
          if (!signal) return;
          signal.addEventListener("abort", () => {
            const e = new Error("aborted");
            e.name = "AbortError";
            reject(e);
          });
        }),
    );
    await expect(
      sendEmail(env, {
        to: "u@bangdream.org",
        subject: "s",
        text: "t",
        timeoutMs: 10,
      }),
    ).rejects.toMatchObject({ code: "RESEND_TIMEOUT", status: 504 });
  });

  it("26. subject with unicode -> subject_hash stable across runs", async () => {
    const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    vi.spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(resendOk("mid_a"))
      .mockResolvedValueOnce(resendOk("mid_b"));

    const SUBJECT = "[bangdream.org] 测试 \u{1F3B8}";
    await sendEmail(env, {
      to: "u@bangdream.org",
      subject: SUBJECT,
      text: "t",
    });
    await sendEmail(env, {
      to: "u@bangdream.org",
      subject: SUBJECT,
      text: "t",
    });

    const eventCalls = logSpy.mock.calls.filter(
      (args) => args[0] === "email_send",
    );
    expect(eventCalls.length).toBe(2);
    const h1 = (eventCalls[0][1] as { subject_hash: string }).subject_hash;
    const h2 = (eventCalls[1][1] as { subject_hash: string }).subject_hash;
    expect(h1).toMatch(/^[0-9a-f]{16}$/);
    expect(h1).toBe(h2);
  });

  it("27. subject empty -> plain Error (NOT EmailSendError)", async () => {
    await expect(
      sendEmail(env, { to: "u@bangdream.org", subject: "", text: "t" }),
    ).rejects.toThrow(/subject required/);
    await expect(
      sendEmail(env, {
        to: "u@bangdream.org",
        subject: "   ",
        text: "t",
      }),
    ).rejects.toThrow(/subject required/);

    try {
      await sendEmail(env, {
        to: "u@bangdream.org",
        subject: "",
        text: "t",
      });
    } catch (err) {
      expect(err).not.toBeInstanceOf(EmailSendError);
    }
  });

  it("28. subject too long (>200 chars) -> plain Error (NOT EmailSendError)", async () => {
    const longSubject = "a".repeat(201);
    await expect(
      sendEmail(env, {
        to: "u@bangdream.org",
        subject: longSubject,
        text: "t",
      }),
    ).rejects.toThrow(/subject too long/);

    try {
      await sendEmail(env, {
        to: "u@bangdream.org",
        subject: longSubject,
        text: "t",
      });
    } catch (err) {
      expect(err).not.toBeInstanceOf(EmailSendError);
    }
  });
});
