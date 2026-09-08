// Firebase Configuration - CDN approach (no bundler needed)
// https://firebase.google.com/docs/web/learn-more#available-libraries

// Firebase SDK scripts are loaded via HTML script tags (firebase-app-compat.js, firebase-auth-compat.js, firebase-firestore-compat.js)

// Your web app's Firebase configuration
var firebaseConfig = {
    apiKey: "AIzaSyAXlP2sdYKQilWSp6IyQ_LjZrc40Kmwvog",
    authDomain: "back-to-school-4b24b.firebaseapp.com",
    projectId: "back-to-school-4b24b",
    storageBucket: "back-to-school-4b24b.firebasestorage.app",
    messagingSenderId: "364686643691",
    appId: "1:364686643691:web:202fc76959e1ab17c309ae",
    measurementId: "G-WFKM0VNV4P"
};

// Initialize Firebase
var firebaseApp = firebase.initializeApp(firebaseConfig);
var auth = firebase.auth();
var db = firebase.firestore();
var messaging = firebase.messaging();

// Auth state listener
auth.onAuthStateChanged(function(user) {
    if (user) {
        console.log('Firebase user signed in:', user.uid);
    } else {
        console.log('Firebase user signed out');
    }
});

// ========================================
// Firebase Cloud Messaging (FCM)
// ========================================
var FCM = {
    token: null,

    // Request permission and get FCM token
    requestPermission: function() {
        if (!('Notification' in window)) {
            console.log('Notifications not supported');
            return Promise.resolve(null);
        }

        return Notification.requestPermission().then(function(permission) {
            if (permission === 'granted') {
                console.log('Notification permission granted');
                return FCM.getToken();
            } else {
                console.log('Notification permission denied');
                return null;
            }
        });
    },

    // Get FCM token
    getToken: function() {
        if (!messaging) {
            console.log('Firebase Messaging not initialized');
            return Promise.resolve(null);
        }

        return messaging.getToken({
            vapidKey: 'BHbgjZrsMxy8Y5YVQWDU5CuMRFzCT1Lotc0yy0HuEgZs3tKRE2nh2vz_E_WSDzo2HlI2ouVKweBx0VMsEf5dmI'
        }).then(function(token) {
            if (token) {
                FCM.token = token;
                console.log('FCM Token:', token);
                // Save token to Firestore
                if (auth.currentUser) {
                    db.collection('users').doc(auth.currentUser.uid).update({
                        fcmToken: token,
                        lastTokenUpdate: firebase.firestore.FieldValue.serverTimestamp()
                    }).catch(function(err) {
                        console.warn('Failed to save FCM token:', err);
                    });
                }
                return token;
            } else {
                console.log('No FCM token available');
                return null;
            }
        }).catch(function(err) {
            console.error('FCM token error:', err);
            return null;
        });
    },

    // Delete FCM token
    deleteToken: function() {
        if (!messaging) return Promise.resolve();
        return messaging.deleteToken().then(function() {
            FCM.token = null;
            console.log('FCM token deleted');
        });
    },

    // Handle incoming messages (when app is in foreground)
    onMessage: function(callback) {
        if (!messaging) return;
        messaging.onMessage(function(payload) {
            console.log('Foreground message:', payload);
            if (callback) callback(payload);
        });
    },

    // Handle background messages (when app is in background)
    onBackgroundMessage: function(callback) {
        if (!messaging) return;
        messaging.setBackgroundMessageHandler(function(payload) {
            console.log('Background message:', payload);
            if (callback) callback(payload);
        });
    }
};

// Auto-request FCM permission on load
if (auth.currentUser) {
    FCM.requestPermission();
}

// ========================================
// Firebase Auth Helpers
// ========================================
var FirebaseAuth = {
    // Sign up with email/password
    signUp: function(email, password, displayName) {
        return auth.createUserWithEmailAndPassword(email, password)
            .then(function(cred) {
                return cred.user.updateProfile({ displayName: displayName }).then(function() {
                    return cred.user;
                });
            });
    },

    // Sign in with email/password
    signIn: function(email, password) {
        return auth.signInWithEmailAndPassword(email, password);
    },

    // Sign out
    signOut: function() {
        return auth.signOut();
    },

    // Get current user
    getCurrentUser: function() {
        return auth.currentUser;
    },

    // Send password reset email
    resetPassword: function(email) {
        return auth.sendPasswordResetEmail(email);
    }
};

// ========================================
// Firestore Data Sync Helpers
// ========================================
var FirebaseFirestore = {
    // Save user data
    saveUser: function(userId, data) {
        return db.collection('users').doc(userId).set(data, { merge: true });
    },

    // Get user data
    getUser: function(userId) {
        return db.collection('users').doc(userId).get();
    },

    // Save homework
    saveHomework: function(userId, homework) {
        return db.collection('users').doc(userId).collection('homework').doc('data').set({ items: homework });
    },

    // Get homework
    getHomework: function(userId) {
        return db.collection('users').doc(userId).collection('homework').doc('data').get();
    },

    // Save exams
    saveExams: function(userId, exams) {
        return db.collection('users').doc(userId).collection('exams').doc('data').set({ items: exams });
    },

    // Get exams
    getExams: function(userId) {
        return db.collection('users').doc(userId).collection('exams').doc('data').get();
    },

    // Save classes
    saveClasses: function(userId, classes) {
        return db.collection('users').doc(userId).collection('classes').doc('data').set({ items: classes });
    },

    // Get classes
    getClasses: function(userId) {
        return db.collection('users').doc(userId).collection('classes').doc('data').get();
    },

    // Save schedule
    saveSchedule: function(userId, schedule) {
        return db.collection('users').doc(userId).collection('schedule').doc('data').set({ items: schedule });
    },

    // Get schedule
    getSchedule: function(userId) {
        return db.collection('users').doc(userId).collection('schedule').doc('data').get();
    },

    // Save gamification
    saveGamification: function(userId, data) {
        return db.collection('users').doc(userId).collection('gamification').doc('data').set(data);
    },

    // Get gamification
    getGamification: function(userId) {
        return db.collection('users').doc(userId).collection('gamification').doc('data').get();
    },

    // Save pomodoro
    savePomodoro: function(userId, data) {
        return db.collection('users').doc(userId).collection('pomodoro').doc('data').set(data);
    },

    // Get pomodoro
    getPomodoro: function(userId) {
        return db.collection('users').doc(userId).collection('pomodoro').doc('data').get();
    },

    // Save time blocks
    saveTimeBlocks: function(userId, blocks) {
        return db.collection('users').doc(userId).collection('timeblocks').doc('data').set({ items: blocks });
    },

    // Get time blocks
    getTimeBlocks: function(userId) {
        return db.collection('users').doc(userId).collection('timeblocks').doc('data').get();
    },

    // Save settings
    saveSettings: function(userId, settings) {
        return db.collection('users').doc(userId).collection('settings').doc('data').set(settings);
    },

    // Get settings
    getSettings: function(userId) {
        return db.collection('users').doc(userId).collection('settings').doc('data').get();
    },

    // Save conversations
    saveConversations: function(userId, conversations) {
        return db.collection('users').doc(userId).collection('conversations').doc('data').set({ items: conversations });
    },

    // Get conversations
    getConversations: function(userId) {
        return db.collection('users').doc(userId).collection('conversations').doc('data').get();
    },

    // Find user by parent code
    findUserByParentCode: function(code) {
        return db.collection('users').where('parentCode', '==', code).limit(1).get();
    }
};

// ========================================
// Full Data Sync (localStorage <-> Firebase)
// ========================================
var DataSync = {
    // Sync all local data to Firebase
    syncToCloud: function(userId) {
        var localData = {
            homework: JSON.parse(localStorage.getItem('bts_homework_' + userId) || '[]'),
            exams: JSON.parse(localStorage.getItem('bts_exams_' + userId) || '[]'),
            classes: JSON.parse(localStorage.getItem('bts_classes_' + userId) || '[]'),
            schedule: JSON.parse(localStorage.getItem('bts_schedule_' + userId) || '[]'),
            gamification: JSON.parse(localStorage.getItem('bts_gamification_' + userId) || 'null'),
            pomodoro: JSON.parse(localStorage.getItem('bts_pomodoro_' + userId) || 'null'),
            timeBlocks: JSON.parse(localStorage.getItem('bts_timeblocks_' + userId) || '[]'),
            settings: JSON.parse(localStorage.getItem('bts_users') || '[]').find(function(u){ return u.id === userId; }) || {},
            conversations: JSON.parse(localStorage.getItem('bts_conversations_' + userId) || '[]'),
            parentCode: localStorage.getItem('bts_parent_code_' + userId) || ''
        };

        var promises = [];
        promises.push(FirebaseFirestore.saveHomework(userId, localData.homework));
        promises.push(FirebaseFirestore.saveExams(userId, localData.exams));
        promises.push(FirebaseFirestore.saveClasses(userId, localData.classes));
        promises.push(FirebaseFirestore.saveSchedule(userId, localData.schedule));
        if (localData.gamification) promises.push(FirebaseFirestore.saveGamification(userId, localData.gamification));
        if (localData.pomodoro) promises.push(FirebaseFirestore.savePomodoro(userId, localData.pomodoro));
        promises.push(FirebaseFirestore.saveTimeBlocks(userId, localData.timeBlocks));
        promises.push(FirebaseFirestore.saveSettings(userId, localData.settings));
        promises.push(FirebaseFirestore.saveConversations(userId, localData.conversations));

        return Promise.all(promises);
    },

    // Sync all Firebase data to localStorage
    syncFromCloud: function(userId) {
        var promises = [
            FirebaseFirestore.getHomework(userId),
            FirebaseFirestore.getExams(userId),
            FirebaseFirestore.getClasses(userId),
            FirebaseFirestore.getSchedule(userId),
            FirebaseFirestore.getGamification(userId),
            FirebaseFirestore.getPomodoro(userId),
            FirebaseFirestore.getTimeBlocks(userId),
            FirebaseFirestore.getSettings(userId),
            FirebaseFirestore.getConversations(userId)
        ];

        return Promise.all(promises).then(function(results) {
            if (results[0].exists()) localStorage.setItem('bts_homework_' + userId, JSON.stringify(results[0].data().items || []));
            if (results[1].exists()) localStorage.setItem('bts_exams_' + userId, JSON.stringify(results[1].data().items || []));
            if (results[2].exists()) localStorage.setItem('bts_classes_' + userId, JSON.stringify(results[2].data().items || []));
            if (results[3].exists()) localStorage.setItem('bts_schedule_' + userId, JSON.stringify(results[3].data().items || []));
            if (results[4].exists()) localStorage.setItem('bts_gamification_' + userId, JSON.stringify(results[4].data()));
            if (results[5].exists()) localStorage.setItem('bts_pomodoro_' + userId, JSON.stringify(results[5].data()));
            if (results[6].exists()) localStorage.setItem('bts_timeblocks_' + userId, JSON.stringify(results[6].data().items || []));
            if (results[7].exists()) {
                var userData = JSON.parse(localStorage.getItem('bts_users') || '[]');
                var idx = userData.findIndex(function(u){ return u.id === userId; });
                if (idx !== -1) {
                    userData[idx] = Object.assign(userData[idx], results[7].data());
                    localStorage.setItem('bts_users', JSON.stringify(userData));
                }
            }
            if (results[8].exists()) localStorage.setItem('bts_conversations_' + userId, JSON.stringify(results[8].data().items || []));
        });
    },

    // Auto-sync: push to cloud every 5 minutes
    startAutoSync: function(userId) {
        setInterval(function() {
            if (auth.currentUser && auth.currentUser.uid === userId) {
                DataSync.syncToCloud(userId).catch(function(err) {
                    console.warn('Auto-sync failed:', err);
                });
            }
        }, 5 * 60 * 1000);
    }
};
