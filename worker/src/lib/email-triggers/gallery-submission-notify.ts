// Gallery submission notification — renders the admin digest HTML+text for the
// email-aggregator cron. Layout matches GALLERY-SUBMIT-DESIGN.md §4.

import type {
  GallerySubmissionDigestPayload,
  GallerySubmissionEntry,
} from "../email-aggregator";

const CAPTION_TRUNCATE_LEN = 50;
const PREVIEW_COUNT = 3;
const ADMIN_PENDING_URL = "https://www.bangdream.org/admin/gallery?tab=pending";

export interface RenderedDigest {
  subject: string;
  html: string;
  text: string;
}

export function renderGallerySubmissionDigest(
  payload: GallerySubmissionDigestPayload,
): RenderedDigest {
  const count = payload.entries.length;
  if (count <= 0) {
    return {
      subject: "[bangdream.org] 新照片待审核",
      html: "<p>无待审核照片</p>",
      text: "无待审核照片\n",
    };
  }
  if (count === 1) {
    return renderSingle(payload.entries[0], payload.pending_total);
  }
  return renderBatch(payload.entries, payload.pending_total);
}

function renderSingle(
  e: GallerySubmissionEntry,
  pendingTotal: number,
): RenderedDigest {
  const subject = `[bangdream.org] 新照片待审核 · ${truncate(e.nickname, 24)}`;
  const captionShown = e.caption ? truncate(e.caption, CAPTION_TRUNCATE_LEN) : "—";
  const eventShown = e.event_slug ?? "—";
  const html = `<div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;font-size:14px;line-height:1.6;color:#222;max-width:520px;">
  <h2 style="margin:0 0 12px;font-size:16px;">新照片待审核</h2>
  <table style="border-collapse:collapse;">
    <tr><td style="padding:4px 12px 4px 0;color:#666;">昵称</td><td>${escapeHtml(e.nickname)}</td></tr>
    <tr><td style="padding:4px 12px 4px 0;color:#666;">说明</td><td>${escapeHtml(captionShown)}</td></tr>
    <tr><td style="padding:4px 12px 4px 0;color:#666;">活动</td><td>${escapeHtml(eventShown)}</td></tr>
    <tr><td style="padding:4px 12px 4px 0;color:#666;">时间</td><td>${escapeHtml(e.submitted_iso)}</td></tr>
    <tr><td style="padding:4px 12px 4px 0;color:#666;">待审核</td><td>${pendingTotal} 张</td></tr>
  </table>
  <p style="margin:16px 0;"><img src="${escapeAttr(e.thumbnail_url)}" alt="" style="max-width:240px;height:auto;border:1px solid #eee;"></p>
  <p style="margin:16px 0 0;"><a href="${ADMIN_PENDING_URL}" style="display:inline-block;background:#1f1d1a;color:#fff;padding:10px 16px;text-decoration:none;">前往审核 →</a></p>
  <hr style="border:none;border-top:1px solid #eee;margin:24px 0 12px;">
  <p style="font-size:12px;color:#999;margin:0;">bangdream.org 投稿通知 · <a href="${ADMIN_PENDING_URL}" style="color:#999;">审核队列</a></p>
</div>`;
  const text = `新照片待审核

昵称: ${e.nickname}
说明: ${captionShown}
活动: ${eventShown}
时间: ${e.submitted_iso}
待审核: ${pendingTotal} 张

缩略图: ${e.thumbnail_url}

前往审核: ${ADMIN_PENDING_URL}

--
bangdream.org 投稿通知
`;
  return { subject, html, text };
}

function renderBatch(
  entries: GallerySubmissionEntry[],
  pendingTotal: number,
): RenderedDigest {
  const total = entries.length;
  const preview = entries.slice(-PREVIEW_COUNT);
  const remainder = total - preview.length;
  const subject = `[bangdream.org] ${total} 张照片待审核`;
  const listHtml = preview
    .map(
      (e) => `<li style="margin-bottom:14px;display:flex;gap:12px;align-items:flex-start;">
  <img src="${escapeAttr(e.thumbnail_url)}" alt="" style="width:80px;height:80px;object-fit:cover;border:1px solid #eee;flex-shrink:0;">
  <div>
    <div style="font-weight:600;">${escapeHtml(e.nickname)}</div>
    <div style="font-size:12.5px;color:#666;">${escapeHtml(e.caption ? truncate(e.caption, CAPTION_TRUNCATE_LEN) : "—")}</div>
    <div style="font-size:11px;color:#999;font-family:monospace;">${escapeHtml(e.event_slug ?? "—")} · ${escapeHtml(e.submitted_iso)}</div>
  </div>
</li>`,
    )
    .join("");
  const moreLine =
    remainder > 0
      ? `<p style="font-size:13px;color:#666;margin:0 0 12px;">…还有 ${remainder} 张,前往后台查看</p>`
      : "";
  const html = `<div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;font-size:14px;line-height:1.6;color:#222;max-width:520px;">
  <h2 style="margin:0 0 12px;font-size:16px;">${total} 张照片待审核</h2>
  <p style="margin:0 0 12px;color:#666;">总计待审核 ${pendingTotal} 张</p>
  <ul style="list-style:none;padding:0;margin:0 0 16px;">${listHtml}</ul>
  ${moreLine}
  <p style="margin:16px 0 0;"><a href="${ADMIN_PENDING_URL}" style="display:inline-block;background:#1f1d1a;color:#fff;padding:10px 16px;text-decoration:none;">前往审核 →</a></p>
  <hr style="border:none;border-top:1px solid #eee;margin:24px 0 12px;">
  <p style="font-size:12px;color:#999;margin:0;">bangdream.org 投稿通知</p>
</div>`;
  const lines = preview.map(
    (e) =>
      `- ${e.nickname} · ${e.caption ? truncate(e.caption, CAPTION_TRUNCATE_LEN) : "—"} · ${e.event_slug ?? "—"} · ${e.submitted_iso}`,
  );
  const text = `${total} 张照片待审核
总计待审核: ${pendingTotal} 张

${lines.join("\n")}
${remainder > 0 ? `\n…还有 ${remainder} 张,前往后台查看\n` : ""}
前往审核: ${ADMIN_PENDING_URL}

--
bangdream.org 投稿通知
`;
  return { subject, html, text };
}

function truncate(s: string, n: number): string {
  if (typeof s !== "string") return "";
  const trimmed = s.trim();
  if (trimmed.length <= n) return trimmed;
  return trimmed.slice(0, n) + "…";
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function escapeAttr(s: string): string {
  return escapeHtml(s);
}
