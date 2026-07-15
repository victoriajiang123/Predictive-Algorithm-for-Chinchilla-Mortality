let clickIntervalId = null;
let currentSelector = null;
let currentIntervalSeconds = null;

function clickTarget(selector) {
  const el = document.querySelector(selector);
  if (el) {
    el.click();
    console.log(`[AutoClicker] Clicked element matching "${selector}" at`, new Date().toLocaleTimeString());
  } else {
    console.warn(`[AutoClicker] No element found for selector "${selector}"`);
  }
}

function startClicking(selector, intervalSeconds) {
  stopClicking(); // clear any existing timer first
  currentSelector = selector;
  currentIntervalSeconds = intervalSeconds;
  // Click immediately once, then on the interval
  clickTarget(selector);
  clickIntervalId = setInterval(() => clickTarget(selector), intervalSeconds * 1000);
}

function stopClicking() {
  if (clickIntervalId !== null) {
    clearInterval(clickIntervalId);
    clickIntervalId = null;
  }
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === "START_CLICKING") {
    startClicking(message.selector, message.intervalSeconds);
    sendResponse({ ok: true });
  } else if (message.type === "STOP_CLICKING") {
    stopClicking();
    sendResponse({ ok: true });
  } else if (message.type === "GET_STATUS") {
    sendResponse({
      running: clickIntervalId !== null,
      selector: currentSelector,
      intervalSeconds: currentIntervalSeconds,
    });
  }
  return true; // keep the message channel open for async sendResponse
});

// Resume clicking automatically if the page reloads while it was running
chrome.storage.local.get(["selector", "intervalSeconds", "autoResume"], (data) => {
  if (data.autoResume && data.selector) {
    startClicking(data.selector, data.intervalSeconds || 10);
  }
});
