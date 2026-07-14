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

  button.click();

  // Tell the native host to start watching for the Windows "Save As" dialog
  // right away, in case this click triggers one.
  chrome.runtime.sendMessage({ action: 'watchDialog' });

  // Give the device a moment to prepare the file and update the page
  // (iframe/link/form) that points at it.
  setTimeout(() => {
    const downloadUrl = findDownloadUrl();

    if (!downloadUrl) {
      console.warn('Click & Save: could not find a download.asp URL after clicking.');
      return;
    }

    fetch(downloadUrl)
      .then((res) => res.arrayBuffer())
      .then((buffer) => {
        const base64 = arrayBufferToBase64(buffer);
        const filename = getFilenameFromUrl(downloadUrl);
        chrome.runtime.sendMessage({ action: 'saveData', data: base64, filename });
      })
      .catch((err) => console.error('Click & Save: fetch failed', err));
  }, 1000);
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
