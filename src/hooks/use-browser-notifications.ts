
'use client';

import { useEffect, useCallback } from 'react';
import { useToast } from './use-toast';

export function useBrowserNotifications() {
  const { toast } = useToast();

  const requestNotificationPermission = useCallback(() => {
    if (!("Notification" in window)) {
      console.log("Browser ini tidak mendukung notifikasi desktop");
      return;
    }

    if (Notification.permission === 'denied') {
        toast({
            title: "Notifikasi Diblokir",
            description: "Anda tidak akan menerima notifikasi penting. Harap izinkan di pengaturan browser.",
            duration: 5000,
        });
        return;
    }

    if (Notification.permission === "default") {
      Notification.requestPermission().then((permission) => {
        if (permission === "granted") {
          console.log("Izin notifikasi diberikan.");
        } else {
             toast({
                title: "Notifikasi Tidak Diizinkan",
                description: "Anda memilih untuk tidak menerima notifikasi.",
                duration: 5000,
             });
        }
      });
    }
  }, [toast]);
  
  const sendNotification = useCallback((title: string, options?: NotificationOptions) => {
    if (!("Notification" in window) || !navigator.serviceWorker) {
      console.log('Browser tidak mendukung notifikasi atau service worker.');
      return;
    }

    if (Notification.permission === "granted") {
      navigator.serviceWorker.ready
        .then((registration) => {
          registration.showNotification(title, {
            body: options?.body,
            icon: "/Logo%20Dreampuff.png", // Menggunakan logo aplikasi
            ...options,
          });
        })
        .catch((err) => {
          console.error('Gagal menampilkan notifikasi via Service Worker:', err);
          // The error message suggests using the service worker, so a fallback is not ideal.
          // Instead, we inform the user that something is wrong.
          toast({
              variant: 'destructive',
              title: 'Gagal Mengirim Notifikasi',
              description: 'Terjadi masalah teknis. Coba muat ulang halaman.'
          })
        });
    } else if (Notification.permission === 'default') {
        // Minta izin jika belum ditentukan
        requestNotificationPermission();
    }
  }, [requestNotificationPermission, toast]);

  // Secara otomatis meminta izin saat hook digunakan
  useEffect(() => {
    requestNotificationPermission();
  }, [requestNotificationPermission]);

  return { sendNotification, requestNotificationPermission };
}
