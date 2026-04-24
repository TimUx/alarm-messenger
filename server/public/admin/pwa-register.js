/**
 * Registers the admin UI service worker (PWA install / basic offline).
 */
(function () {
  if (!('serviceWorker' in navigator)) {
    return;
  }
  window.addEventListener('load', function () {
    navigator.serviceWorker
      .register('/admin/sw.js', { scope: '/admin/' })
      .catch(function () {
        /* ignore — e.g. blocked CSP or unsupported context */
      });
  });
})();
