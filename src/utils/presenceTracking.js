import {
  ref,
  onValue,
  onDisconnect,
  set,
  serverTimestamp,
} from "firebase/database";
import { database } from "../config/firebase";

class PresenceTracking {
  constructor() {
    this.userId = null;
    this.userRef = null;
    this.isInitialized = false;
  }

  // Initialize presence tracking for a user
  initializePresence(userId) {
    if (this.isInitialized) {
      this.cleanup();
    }

    this.userId = userId;
    this.userRef = ref(database, `presence/${userId}`);

    // Create a reference to the special '.info/connected' path in Realtime Database
    const connectedRef = ref(database, ".info/connected");

    onValue(connectedRef, (snapshot) => {
      if (snapshot.val() === true) {
        // User is online
        const presenceData = {
          online: true,
          lastSeen: serverTimestamp(),
          userId: userId,
        };

        // Set user as online
        set(this.userRef, presenceData);

        // When user disconnects, update their status
        onDisconnect(this.userRef).set({
          online: false,
          lastSeen: serverTimestamp(),
          userId: userId,
        });

        this.isInitialized = true;
      }
    });
  }

  // Set user as offline
  setOffline() {
    if (this.userRef && this.userId) {
      set(this.userRef, {
        online: false,
        lastSeen: serverTimestamp(),
        userId: this.userId,
      });
    }
  }

  // Cleanup when user logs out
  cleanup() {
    this.setOffline();
    this.userId = null;
    this.userRef = null;
    this.isInitialized = false;
  }

  // Get count of active users
  getActiveUsersCount(callback) {
    const presenceRef = ref(database, "presence");

    return onValue(presenceRef, (snapshot) => {
      const presenceData = snapshot.val();
      let activeCount = 0;

      if (presenceData) {
        Object.values(presenceData).forEach((user) => {
          if (user.online === true) {
            activeCount++;
          }
        });
      }

      callback(activeCount);
    });
  }

  // Track page view
  trackPageView(userId, pageName) {
    if (!userId || !pageName) return;

    const pageViewRef = ref(
      database,
      `pageViews/${
        new Date().toISOString().split("T")[0]
      }/${userId}/${Date.now()}`
    );
    set(pageViewRef, {
      page: pageName,
      timestamp: serverTimestamp(),
      userId: userId,
    });
  }

  // Track visitor session (even for non-logged in users)
  trackVisitorSession() {
    const now = Date.now();
    const SESSION_DURATION = 30 * 24 * 60 * 60 * 1000; // 30 days in milliseconds

    // Get stored session data
    const storedSessionData = localStorage.getItem("sessionData");
    let sessionId = null;
    let isExpired = false;

    if (storedSessionData) {
      try {
        const { id, timestamp } = JSON.parse(storedSessionData);
        // Check if session expired (older than 30 days)
        isExpired = now - timestamp > SESSION_DURATION;

        if (!isExpired) {
          sessionId = id;
        } else {
        }
      } catch (error) {
        isExpired = true;
      }
    }

    // Create new session if none exists or expired
    if (!sessionId || isExpired) {
      sessionId = `session_${now}_${Math.random().toString(36).substr(2, 9)}`;

      // Store session with timestamp
      localStorage.setItem(
        "sessionData",
        JSON.stringify({
          id: sessionId,
          timestamp: now,
        })
      );

      const dateKey = new Date().toISOString().split("T")[0];

      // Track new visitor
      const visitorRef = ref(database, `visitors/${dateKey}/${sessionId}`);

      set(visitorRef, {
        timestamp: serverTimestamp(),
        sessionId: sessionId,
        userAgent: navigator.userAgent,
      })
        .then(() => {})
        .catch((error) => {});
    }

    // Track anonymous user presence in real-time
    this.initializeAnonymousPresence(sessionId);
  }

  // Initialize anonymous presence tracking
  initializeAnonymousPresence(sessionId) {
    const anonymousRef = ref(database, `anonymousPresence/${sessionId}`);
    const connectedRef = ref(database, ".info/connected");

    onValue(connectedRef, (snapshot) => {
      if (snapshot.val() === true) {
        // Anonymous user is online
        const presenceData = {
          online: true,
          lastSeen: serverTimestamp(),
          sessionId: sessionId,
        };

        set(anonymousRef, presenceData);

        // When user disconnects, update their status
        onDisconnect(anonymousRef).set({
          online: false,
          lastSeen: serverTimestamp(),
          sessionId: sessionId,
        });
      }
    });
  }
}

export default new PresenceTracking();
