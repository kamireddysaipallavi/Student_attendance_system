import { initializeApp } from
    "https://www.gstatic.com/firebasejs/10.14.1/firebase-app.js";

const firebaseConfig = {
    apiKey: "AIzaSyBI75_DHE_ZR2SefF06UFRV1LGz4OCQcbY",
  authDomain: "cloudstuatt.firebaseapp.com",
  projectId: "cloudstuatt",
  storageBucket: "cloudstuatt.firebasestorage.app",
  messagingSenderId: "448404125393",
  appId: "1:448404125393:web:b061016b868a7afe68b7f0",
  measurementId: "G-2CFZER9321"
};

export const app = initializeApp(firebaseConfig);