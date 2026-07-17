// Service Worker adicional para manejo de notificaciones
// Se registra después del SW principal de Workbox
// Solo maneja el clic en notificaciones para abrir la app

self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const data = event.notification.data || {};
  const targetUrl = data.url || '/';

  event.waitUntil(
    (async () => {
      const clientList = await self.clients.matchAll({
        type: 'window',
        includeUncontrolled: true
      });

      // Si ya hay una ventana abierta, enfocarla y navegar
      for (const client of clientList) {
        if ('focus' in client) {
          client.focus();
          if ('navigate' in client) {
            try {
              await client.navigate(targetUrl);
            } catch {
              // ignorar
            }
          }
          return;
        }
      }

      // Si no hay ventana, abrir una nueva
      if (self.clients.openWindow) {
        await self.clients.openWindow(targetUrl);
      }
    })()
  );
});

// Cerrar notificaciones antiguas cuando se actualiza el SW
self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      // Tomar control inmediatamente
      await self.clients.claim();
    })()
  );
});
