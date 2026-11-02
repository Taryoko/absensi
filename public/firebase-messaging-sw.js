// Scripts for Firebase Cloud Messaging in background
importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-messaging-compat.js');

const firebaseConfig = {
  apiKey: "AIzaSyDemoDummyKeyForAppletBuild2026",
  authDomain: "absensi-guru-smk.firebaseapp.com",
  projectId: "absensi-guru-smk",
  storageBucket: "absensi-guru-smk.appspot.com",
  messagingSenderId: "1029384756",
  appId: "1:1029384756:web:abcdef1234567890"
};

try {
  firebase.initializeApp(firebaseConfig);
  const messaging = firebase.messaging();

  messaging.onBackgroundMessage((payload) => {
    console.log('[firebase-messaging-sw.js] Background message received: ', payload);
    const notificationTitle = payload.notification ? payload.notification.title : 'Notifikasi Absensi Guru';
    const notificationOptions = {
      body: payload.notification ? payload.notification.body : 'Pembaruan status absensi oleh admin.',
      icon: 'https://images.unsplash.com/photo-1546410531-bb4caa6b424d?w=120&auto=format&fit=crop&q=80',
    };

    self.registration.showNotification(notificationTitle, notificationOptions);
  });
} catch (e) {
  console.log('[SW] Firebase background messaging init note:', e);
}
