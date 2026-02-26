// RFP Radar — Chrome Extension Background Service Worker
// Context menu: "Analyze with RFP Radar" on selected text.
// Text is sent via POST to /api/intake (never in the URL) to avoid leaking
// content in browser history, server logs, or referrer headers.

const WEB_APP_URL = "http://localhost:3000"; // TODO: change to production URL before release

const MIN_SELECTION_CHARS = 50;
const MAX_SELECTION_CHARS = 50_000;

chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: "rfp-radar-analyze",
    title: "Analyze with RFP Radar",
    contexts: ["selection"],
  });
});

chrome.contextMenus.onClicked.addListener(async (info) => {
  if (info.menuItemId !== "rfp-radar-analyze") return;

  const selected = info.selectionText?.trim() ?? "";

  if (selected.length < MIN_SELECTION_CHARS) {
    // Too short — open app without prefill so user can paste manually
    chrome.tabs.create({ url: `${WEB_APP_URL}/analyze` });
    return;
  }

  const text = selected.slice(0, MAX_SELECTION_CHARS);

  try {
    const resp = await fetch(`${WEB_APP_URL}/api/intake`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text }),
    });

    if (!resp.ok) throw new Error(`intake error ${resp.status}`);
    const { token } = await resp.json() as { token: string };
    chrome.tabs.create({ url: `${WEB_APP_URL}/analyze?token=${encodeURIComponent(token)}` });
  } catch {
    // Fallback: open app so user can paste manually
    chrome.tabs.create({ url: `${WEB_APP_URL}/analyze` });
  }
});
