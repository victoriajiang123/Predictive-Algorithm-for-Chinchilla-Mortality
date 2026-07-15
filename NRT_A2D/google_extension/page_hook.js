(function () {
  const originalOpen = window.open;

  function notify(url) {
    window.dispatchEvent(
      new CustomEvent('__clicksave_download_url__', { detail: { url } })
    );
  }

  function isDownloadUrl(url) {
    return typeof url === 'string' && url.includes('download.asp');
  }

  window.open = function (url, name, specs) {
    // Case 1: the page calls window.open(actualDownloadUrl, ...) directly.
    if (isDownloadUrl(url)) {
      notify(url);
      return { close() {}, closed: false, focus() {}, location: { href: '' } };
    }

    // Case 2: the page opens a blank window first, then sets its
    // location afterward (e.g. window.open('', 'x'); w.location = url;).
    const realWin = originalOpen.call(window, url, name, specs);
    if (!realWin) return realWin;

    try {
      return new Proxy(realWin, {
        set(target, prop, value) {
          if (prop === 'location' && isDownloadUrl(value)) {
            notify(value);
            return true; // pretend it navigated, without actually doing so
          }
          target[prop] = value;
          return true;
        },
      });
    } catch {
      return realWin; // Proxy not possible (cross-origin window) — fall back
    }
  };
})();
