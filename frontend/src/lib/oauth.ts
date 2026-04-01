import type { ConnectedAccount } from "./types";

export type OAuthCompleteMessage = {
  type: "discogs-oauth-complete";
  account?: ConnectedAccount;
};

export function renderOAuthPopup(
  popup: Window,
  title: string,
  message: string,
  details?: string,
): void {
  const detailMarkup = details
    ? `<pre style="margin: 1rem 0 0; padding: 0.75rem; background: #f5f5f5; border-radius: 8px; white-space: pre-wrap; word-break: break-word; text-align: left;">${escapeHtml(details)}</pre>`
    : "";

  popup.document.title = title;
  popup.document.body.innerHTML = `
    <main style="max-width: 42rem; margin: 0 auto; padding: 24px; font-family: system-ui, sans-serif; color: #1d1d1d;">
      <h1 style="margin: 0 0 12px; font-size: 1.25rem;">${escapeHtml(title)}</h1>
      <p style="margin: 0; line-height: 1.5;">${escapeHtml(message)}</p>
      ${detailMarkup}
    </main>
  `;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
