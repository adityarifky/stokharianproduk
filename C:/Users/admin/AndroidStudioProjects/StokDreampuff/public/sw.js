
// Ini adalah service worker dasar.

self.addEventListener('install', (event) => {
  console.log('Service Worker: F_Install');
  // Lewati fase 'waiting' agar service worker segera aktif.
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  console.log('Service Worker: F_Aktif');
  // Ambil alih kontrol semua klien (tab) yang terbuka.
  event.waitUntil(self.clients.claim());
});

// Menangani apa yang terjadi saat pengguna mengklik notifikasi.
self.addEventListener('notificationclick', (event) => {
  console.log('Service Worker: Klik Notifikasi Diterima.');

  // Tutup notifikasi yang diklik.
  event.notification.close();

  // Buka aplikasi atau fokus ke jendela yang sudah ada.
  event.waitUntil(
    clients.matchAll({
      type: 'window',
      includeUncontrolled: true,
    }).then((clientList) => {
      // Jika jendela aplikasi sudah terbuka, fokus ke sana.
      for (const client of clientList) {
        if ('focus' in client) {
          return client.focus();
        }
      }
      // Jika tidak ada jendela yang terbuka, buka jendela baru.
      if (clients.openWindow) {
        return clients.openWindow('/');
      }
    })
  );
});
