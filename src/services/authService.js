// Firebase Authentication Services
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  sendPasswordResetEmail,
  updateProfile,
  updatePassword,
  reauthenticateWithCredential,
  EmailAuthProvider,
  deleteUser,
} from "firebase/auth";
import {
  doc,
  setDoc,
  getDoc,
  updateDoc,
  serverTimestamp,
  deleteDoc,
  collection,
  getDocs,
} from "firebase/firestore";
import { auth, secondaryAuth, db } from "../config/firebase";
import { createUniqueSlug } from "../utils/slugHelpers";

// Register new customer
export const registerCustomer = async (userData) => {
  try {
    const { email, password, name, phone, birthDate, skinType, allergies } =
      userData;

    // Create user with email and password
    const userCredential = await createUserWithEmailAndPassword(
      auth,
      email,
      password
    );
    const user = userCredential.user;

    // Update display name
    await updateProfile(user, {
      displayName: name,
    });

    // Get all users for unique slug generation
    const usersSnapshot = await getDocs(collection(db, "users"));
    const existingUsers = usersSnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));
    const slug = createUniqueSlug(name, existingUsers);

    // Create user document in Firestore
    const userDocRef = doc(db, "users", user.uid);
    await setDoc(userDocRef, {
      uid: user.uid,
      email: user.email,
      name,
      displayName: name,
      phone,
      birthDate,
      skinType,
      allergies: allergies || ["لا توجد"],
      role: "customer",
      active: true,
      slug,
      joinDate: serverTimestamp(),
      appointmentsCount: 0,
      totalSpent: 0,
      loyaltyPoints: 0,
      avatar: null,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    return {
      user: user,
      userData: {
        uid: user.uid,
        email: user.email,
        name,
        phone,
        birthDate,
        skinType,
        allergies: allergies || ["لا توجد"],
        role: "customer",
        active: true,
        appointmentsCount: 0,
        totalSpent: 0,
        loyaltyPoints: 0,
      },
    };
  } catch (error) {
    console.error("Error registering customer:", error);
    throw error;
  }
};

// Login user
export const loginUser = async (email, password) => {
  try {
    const userCredential = await signInWithEmailAndPassword(
      auth,
      email,
      password
    );
    const user = userCredential.user;

    // Get user data from Firestore
    const userDocRef = doc(db, "users", user.uid);
    const userDoc = await getDoc(userDocRef);

    if (!userDoc.exists()) {
      throw new Error("بيانات المستخدم غير موجودة");
    }

    const userData = userDoc.data();

    // Update last login
    await updateDoc(userDocRef, {
      lastLogin: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    return {
      user: user,
      userData: userData,
    };
  } catch (error) {
    console.error("Error logging in:", error);
    throw error;
  }
};

// Logout user
export const logoutUser = async () => {
  try {
    await signOut(auth);
  } catch (error) {
    console.error("Error logging out:", error);
    throw error;
  }
};

// Get current user data
export const getCurrentUserData = async (uid) => {
  try {
    const userDocRef = doc(db, "users", uid);
    const userDoc = await getDoc(userDocRef);

    if (userDoc.exists()) {
      return userDoc.data();
    }
    return null;
  } catch (error) {
    console.error("Error getting user data:", error);
    throw error;
  }
};

// Create staff user (admin only)
export const createStaffUser = async (staffData, createdByUid) => {
  try {
    const {
      email,
      password,
      name,
      phone,
      specialization,
      permissions,
      workingHours,
    } = staffData;

    // Create user with email and password
    const userCredential = await createUserWithEmailAndPassword(
      auth,
      email,
      password
    );
    const user = userCredential.user;

    // Update display name
    await updateProfile(user, {
      displayName: name,
    });

    // Create staff document in Firestore
    const userDocRef = doc(db, "users", user.uid);
    await setDoc(userDocRef, {
      uid: user.uid,
      email: user.email,
      name,
      phone,
      role: "staff",
      specialization,
      permissions,
      workingHours,
      active: true,
      joinDate: serverTimestamp(),
      createdBy: createdByUid,
      avatar: null,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    return {
      user: user,
      userData: {
        uid: user.uid,
        email: user.email,
        name,
        phone,
        role: "staff",
        specialization,
        permissions,
        workingHours,
        active: true,
      },
    };
  } catch (error) {
    console.error("Error creating staff user:", error);
    throw error;
  }
};

// Create admin user (super admin only)
export const createAdminUser = async (adminData, createdByUid) => {
  try {
    const { email, password, name, phone, permissions } = adminData;

    // Create user with email and password
    const userCredential = await createUserWithEmailAndPassword(
      auth,
      email,
      password
    );
    const user = userCredential.user;

    // Update display name
    await updateProfile(user, {
      displayName: name,
    });

    // Create admin document in Firestore
    const userDocRef = doc(db, "users", user.uid);
    await setDoc(userDocRef, {
      uid: user.uid,
      email: user.email,
      name,
      phone,
      role: "admin",
      permissions,
      active: true,
      joinDate: serverTimestamp(),
      createdBy: createdByUid,
      avatar: null,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    return {
      user: user,
      userData: {
        uid: user.uid,
        email: user.email,
        name,
        phone,
        role: "admin",
        permissions,
        active: true,
      },
    };
  } catch (error) {
    console.error("Error creating admin user:", error);
    throw error;
  }
};

// Admin function to register a new customer with authentication
export const adminRegisterCustomer = async (customerData) => {
  try {
    const {
      email,
      password = "TempPassword123!", // Fallback if no password provided
      name,
      phone,
      birthDate,
      skinType,
      allergies,
    } = customerData;

    // Create user with secondary auth instance to avoid logging out admin
    const userCredential = await createUserWithEmailAndPassword(
      secondaryAuth,
      email,
      password // Use the custom password provided by admin
    );
    const user = userCredential.user;

    // Update display name
    await updateProfile(user, {
      displayName: name,
    });

    // Create user document in Firestore
    const userDocRef = doc(db, "users", user.uid);
    await setDoc(userDocRef, {
      uid: user.uid,
      email: user.email,
      name,
      phone,
      birthDate: birthDate || "",
      skinType: skinType || "",
      allergies: allergies || ["لا توجد"],
      role: "customer",
      active: true,
      joinDate: serverTimestamp(),
      appointmentsCount: 0,
      totalSpent: 0,
      loyaltyPoints: 0,
      avatar: "/assets/default-avatar.jpg",
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      passwordResetRequired: true, // Flag to indicate password reset is required
    });

    // Sign out from secondary auth to clean up
    await signOut(secondaryAuth);

    return {
      user: user,
      userData: {
        uid: user.uid,
        email: user.email,
        name,
        phone,
        birthDate,
        skinType,
        allergies: allergies || ["لا توجد"],
        role: "customer",
        active: true,
        appointmentsCount: 0,
        totalSpent: 0,
        loyaltyPoints: 0,
      },
      tempPassword: password, // Return the password used for display
    };
  } catch (error) {
    console.error("Error admin registering customer:", error);
    throw error;
  }
};

// Admin function to register a new staff member with authentication
export const adminRegisterStaff = async (staffData) => {
  try {
    const {
      email,
      password = "TempPassword123!", // Fallback if no password provided
      name,
      phone,
      specialization,
      active = true,
    } = staffData;

    // Create user with secondary auth instance to avoid logging out admin
    const userCredential = await createUserWithEmailAndPassword(
      secondaryAuth,
      email,
      password // Use the custom password provided by admin
    );
    const user = userCredential.user;

    // Update display name
    await updateProfile(user, {
      displayName: name,
    });

    // Get all users for unique slug generation
    const usersSnapshot = await getDocs(collection(db, "users"));
    const existingUsers = usersSnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));
    const slug = createUniqueSlug(name, existingUsers);

    // Create user document in Firestore
    const userDocRef = doc(db, "users", user.uid);
    await setDoc(userDocRef, {
      uid: user.uid,
      email: user.email,
      name,
      displayName: name,
      phone,
      specialization,
      role: "staff",
      active,
      slug,
      joinDate: serverTimestamp(),
      appointmentsCount: 0,
      totalRevenue: 0,
      rating: 5.0,
      avatar: "/assets/default-avatar.jpg",
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      passwordResetRequired: true, // Flag to indicate password reset is required
    });

    // Sign out from secondary auth to clean up
    await signOut(secondaryAuth);

    return {
      user: user,
      userData: {
        uid: user.uid,
        email: user.email,
        name,
        phone,
        specialization,
        role: "staff",
        active,
        appointmentsCount: 0,
        totalRevenue: 0,
        rating: 5.0,
      },
      tempPassword: password, // Return the password used for display
    };
  } catch (error) {
    console.error("Error admin registering staff:", error);
    throw error;
  }
};

// Send password reset email
export const resetPassword = async (email) => {
  try {
    await sendPasswordResetEmail(auth, email);
  } catch (error) {
    console.error("Error sending password reset email:", error);
    throw error;
  }
};

// Auth state observer
export const onAuthStateChange = (callback) => {
  return onAuthStateChanged(auth, callback);
};

// Error message translator
export const getFirebaseErrorMessage = (error) => {
  switch (error.code) {
    case "auth/user-not-found":
      return "البريد الإلكتروني غير موجود";
    case "auth/wrong-password":
      return "كلمة المرور غير صحيحة";
    case "auth/email-already-in-use":
      return "البريد الإلكتروني مستخدم من قبل";
    case "auth/weak-password":
      return "كلمة المرور ضعيفة جداً";
    case "auth/invalid-email":
      return "البريد الإلكتروني غير صحيح";
    case "auth/too-many-requests":
      return "تم تجاوز عدد المحاولات المسموحة، حاولي لاحقاً";
    case "auth/network-request-failed":
      return "فشل في الاتصال بالشبكة";
    default:
      return error.message || "حدث خطأ غير متوقع";
  }
};
