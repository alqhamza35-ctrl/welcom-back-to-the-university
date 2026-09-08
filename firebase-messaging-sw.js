// Firebase Cloud Messaging Service Worker
// Handles push notifications when app is in background

importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-messaging-compat.js');

// Initialize Firebase
firebase.initializeApp({
    apiKey: "AIzaSyAXlP2sdYKQilWSp6IyQ_LjZrc40Kmwvog",
    authDomain: "back-to-school-4b24b.firebaseapp.com",
    projectId: "back-to-school-4b24b",
    storageBucket: "back-to-school-4b24b.firebasestorage.app",
    messagingSenderId: "364686643691",
    appId: "1:364686643691:web:202fc76959e1ab17c309ae",
    measurementId: "G-WFKM0VNV4P"
});

var messaging = firebase.messaging();

// Handle background messages
messaging.onBackgroundMessage(function(payload) {
    console.log('[SW] Background message:', payload);
    
    var title = payload.notification?.title || 'Back to School';
    var body = payload.notification?.body || '';
    var icon = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><text y=".9em" font-size="90">🎓</text></svg>';

    self.registration.showNotification(title, {
        body: body,
        icon: icon,
        badge: icon,
        data: payload.data
    });
});

// Handle notification click
self.addEventListener('notificationclick', function(event) {
    event.notification.close();
    event.waitUntil(
        clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function(clientList) {
            for (var i = 0; i < clientList.length; i++) {
                var client = clientList[i];
                if (client.url.includes('dashboard.html') && 'focus' in client) {
                    return client.focus();
                }
            }
            if (clients.openWindow) {
                return clients.openWindow('dashboard.html');
            }
        })
    );
});
