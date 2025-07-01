
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
    if (!("Notification" in window)) {
      return;
    }

    if (Notification.permission === "granted") {
      const notification = new Notification(title, {
        body: options?.body,
        icon: "/Logo%20Dreampuff.png", // Menggunakan logo aplikasi
        ...options,
      });
      // Tambahkan event listener jika perlu, misalnya onClick
      notification.onclick = () => {
        window.focus(); // Bawa window ke depan saat notifikasi diklik
      };
    } else if (Notification.permission === 'default') {
        // Minta izin jika belum ditentukan
        requestNotificationPermission();
    }
  }, [requestNotificationPermission]);

  // Secara otomatis meminta izin saat hook digunakan
  useEffect(() => {
    requestNotificationPermission();
  }, [requestNotificationPermission]);

  return { sendNotification, requestNotificationPermission };
}
