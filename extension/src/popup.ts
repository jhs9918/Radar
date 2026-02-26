// RFP Radar popup — always uses POST /api/intake, never URL params for text.

const WEB_APP_URL = "http://localhost:3000"; // TODO: change to production URL before release

const MAX_TEXT_CHARS = 50_000;

const btn = document.getElementById("analyze-btn") as HTMLButtonElement;
const textArea = document.getElementById("rfp-text") as HTMLTextAreaElement;
const errorDiv = document.getElementById("error") as HTMLDivElement;

function showError(msg: string) {
  errorDiv.textContent = msg;
  errorDiv.style.display = "block";
}

function clearError() {
  errorDiv.style.display = "none";
}

btn.addEventListener("click", async () => {
  clearError();
  const text = textArea.value.trim().slice(0, MAX_TEXT_CHARS);

  if (!text || text.length < 50) {
    showError("Please paste at least 50 characters of RFP text.");
    return;
  }

  btn.disabled = true;
  btn.textContent = "Opening...";

  try {
    const resp = await fetch(`${WEB_APP_URL}/api/intake`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text }),
    });

    if (!resp.ok) {
      const body = await resp.json() as { error?: string };
      throw new Error(body.error ?? `Server error ${resp.status}`);
    }

    const { token } = await resp.json() as { token: string };
    chrome.tabs.create({ url: `${WEB_APP_URL}/analyze?token=${encodeURIComponent(token)}` });
    window.close();
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    showError(`Could not connect to RFP Radar: ${msg}. Is the app running?`);
    btn.disabled = false;
    btn.textContent = "Analyze RFP →";
  }
});
