let intervalId = null;

chrome.runtime.onMessage.addListener((msg) => {
  if (msg.action === 'start') {
    if (intervalId) return; // already running
    clickAndSave(); // run immediately, then every 10s
    intervalId = setInterval(clickAndSave, 10000);
    console.log('Click & Save: started, running every 10s.');
  }

  if (msg.action === 'stop') {
    clearInterval(intervalId);
    intervalId = null;
    console.log('Click & Save: stopped.');
  }
});

function clickAndSave() {
  const button = document.querySelector('#idBtnSave');

  if (!button) {
    console.warn('Click & Save: button not found on this page.');
    return;
  }

  let handled = false;

  // Watches the whole page continuously the instant we click, so we catch
  // the download URL the moment it appears — even if it's removed again
  // right away (common pattern for "invisible" downloads).
  const observer = new MutationObserver((mutationsList) => {
    if (handled) return;

    for (const mutation of mutationsList) {
      let url = null;

      if (mutation.type === 'attributes') {
        const el = mutation.target;
        const val = el.getAttribute(mutation.attributeName);
        if (val && val.includes('download.asp')) {
          url = new URL(val, window.location.href).href;
        }
      } else if (mutation.type === 'childList') {
        for (const node of mutation.addedNodes) {
          if (node.nodeType === 1) {
            const src = node.src || node.href || (node.tagName === 'FORM' ? node.action : null);
            if (src && src.includes('download.asp')) {
              url = src;
            }
          }
        }
      }

      if (url) {
        handled = true;
        observer.disconnect();
        fetchAndSave(url);
        return;
      }
    }
  });

  observer.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ['src', 'href', 'action'],
    childList: true,
    subtree: true,
  });

  // Tell the native host to start watching for the Windows "Save As" dialog
  // right away, in case this click triggers one.
  chrome.runtime.sendMessage({ action: 'watchDialog' });

  button.click();

  // Fallback in case the URL was already present before we started
  // observing, or the observer somehow missed it.
  setTimeout(() => {
    if (handled) return;

    const url = findDownloadUrl();
    observer.disconnect();

    if (url) {
      handled = true;
      fetchAndSave(url);
    } else {
      console.warn('Click & Save: could not find a download.asp URL after clicking.');
    }
  }, 3000);
}

function fetchAndSave(downloadUrl) {
  fetch(downloadUrl)
    .then((res) => res.arrayBuffer())
    .then((buffer) => {
      const base64 = arrayBufferToBase64(buffer);
      const filename = getFilenameFromUrl(downloadUrl);
      chrome.runtime.sendMessage({ action: 'saveData', data: base64, filename });
    })
    .catch((err) => console.error('Click & Save: fetch failed', err));
}

function findDownloadUrl() {
  // Looks anywhere on the page for something pointing at download.asp,
  // grabbing whatever the CURRENT params are (works whether they change or not).
  const iframe = Array.from(document.querySelectorAll('iframe')).find(
    (f) => f.src && f.src.includes('download.asp')
  );
  if (iframe) return iframe.src;

  const anchor = Array.from(document.querySelectorAll('a')).find(
    (a) => a.href && a.href.includes('download.asp')
  );
  if (anchor) return anchor.href;

  const form = Array.from(document.querySelectorAll('form')).find(
    (f) => f.action && f.action.includes('download.asp')
  );
  if (form) return form.action;

  return null;
}

function getFilenameFromUrl(url) {
  try {
    const urlObj = new URL(url, window.location.origin);
    return urlObj.searchParams.get('filename') || 'scope-data.scp';
  } catch {
    return 'scope-data.scp';
  }
}

function arrayBufferToBase64(buffer) {
  let binary = '';
  const bytes = new Uint8Array(buffer);
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}
