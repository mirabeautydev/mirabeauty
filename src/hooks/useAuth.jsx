// Custom authentication hook with Firebase
import { useState, useEffect, useContext, createContext } from "react";
import { onAuthStateChange, getCurrentUserData } from "../services/authService";

// Create Auth Context
const AuthContext = createContext();

// Auth Provider Component
export const AuthProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(null);
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [authReady, setAuthReady] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChange(async (user) => {
      
      if (user) {
        try {
          // Get user data from Firestore with retry logic
          // (handles race condition where auth user is created before Firestore doc)
          let userDoc = await getCurrentUserData(user.uid);
          let retries = 0;
          const maxRetries = 5;

          // If document doesn't exist, retry a few times with delay
          while (!userDoc && retries < maxRetries) {
            
            await new Promise((resolve) => setTimeout(resolve, 500));
            userDoc = await getCurrentUserData(user.uid);
            retries++;
          }


          if (userDoc) {
            setCurrentUser(user);
            setUserData(userDoc);
            setAuthReady(true);
          } else {
            console.error("No user document found in Firestore after retries");
            setCurrentUser(null);
            setUserData(null);
            setAuthReady(true);
          }
        } catch (error) {
          console.error("Error fetching user data:", error);
          setCurrentUser(null);
          setUserData(null);
          setAuthReady(true);
        }
      } else {
        setCurrentUser(null);
        setUserData(null);
        setAuthReady(true);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // Function to refresh user data
  const refreshUserData = async () => {
    if (currentUser) {
      try {
        const userDoc = await getCurrentUserData(currentUser.uid);
        if (userDoc) {
          setUserData(userDoc);
        }
      } catch (error) {
        console.error("Error refreshing user data:", error);
      }
    }
  };

  // Function to wait for auth to be ready after login/signup
  const waitForAuth = () => {
    
    return new Promise((resolve) => {
      if (authReady && currentUser && userData) {
        resolve();
        return;
      }

      const checkInterval = setInterval(() => {
        
        if (currentUser && userData) {
          clearInterval(checkInterval);
          resolve();
        }
      }, 100);

      // Timeout after 5 seconds
      setTimeout(() => {
        clearInterval(checkInterval);
        resolve();
      }, 5000);
    });
  };

  const value = {
    currentUser,
    userData,
    loading,
    authReady,
    setUserData, // For updating user data after profile updates
    refreshUserData, // For manually refreshing user data
    waitForAuth, // Wait for auth state to be ready
  };

  // Show loading spinner while auth is initializing

  if (loading) {
    return (
      <div
        style={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          height: "100vh",
          fontSize: "20px",
          fontWeight: "bold",
          backgroundColor: "#f8f9fa",
        }}
      >
        <div style={{ textAlign: "center" }}>
          <div
            style={{
              width: "50px",
              height: "50px",
              border: "5px solid #f3f3f3",
              borderTop: "5px solid #8b5cf6",
              borderRadius: "50%",
              animation: "spin 1s linear infinite",
              margin: "0 auto 20px",
            }}
          ></div>
          <style>{`
            @keyframes spin {
              0% { transform: rotate(0deg); }
              100% { transform: rotate(360deg); }
            }
          `}</style>
          جاري التحميل...
        </div>
      </div>
    );
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

// Custom hook to use auth context
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
