// User management service for Firestore
import {
  collection,
  doc,
  getDocs,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "../config/firebase";

// Get all users (admin/staff only)
export const getAllUsers = async () => {
  try {
    const usersRef = collection(db, "users");
    const snapshot = await getDocs(usersRef);
    return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
  } catch (error) {
    console.error("Error getting all users:", error);
    throw error;
  }
};

// Get users by role
export const getUsersByRole = async (role) => {
  try {
    const usersRef = collection(db, "users");
    const q = query(usersRef, where("role", "==", role));
    const snapshot = await getDocs(q);
    return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
  } catch (error) {
    console.error("Error getting users by role:", error);
    throw error;
  }
};

// Update user profile
export const updateUserProfile = async (uid, updateData) => {
  try {
    const userRef = doc(db, "users", uid);
    await updateDoc(userRef, {
      ...updateData,
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    console.error("Error updating user profile:", error);
    throw error;
  }
};

// Update user avatar
export const updateUserAvatar = async (uid, avatarUrl) => {
  try {
    const userRef = doc(db, "users", uid);
    await updateDoc(userRef, {
      avatar: avatarUrl,
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    console.error("Error updating user avatar:", error);
    throw error;
  }
};

// Deactivate user (soft delete)
export const deactivateUser = async (uid) => {
  try {
    const userRef = doc(db, "users", uid);
    await updateDoc(userRef, {
      active: false,
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    console.error("Error deactivating user:", error);
    throw error;
  }
};

// Activate user
export const activateUser = async (uid) => {
  try {
    const userRef = doc(db, "users", uid);
    await updateDoc(userRef, {
      active: true,
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    console.error("Error activating user:", error);
    throw error;
  }
};

// Update staff working hours
export const updateStaffWorkingHours = async (uid, workingHours) => {
  try {
    const userRef = doc(db, "users", uid);
    await updateDoc(userRef, {
      workingHours,
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    console.error("Error updating working hours:", error);
    throw error;
  }
};

// Update staff specialization
export const updateStaffSpecialization = async (uid, specialization) => {
  try {
    const userRef = doc(db, "users", uid);
    await updateDoc(userRef, {
      specialization,
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    console.error("Error updating specialization:", error);
    throw error;
  }
};

// Update user permissions (admin only)
export const updateUserPermissions = async (uid, permissions) => {
  try {
    const userRef = doc(db, "users", uid);
    await updateDoc(userRef, {
      permissions,
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    console.error("Error updating permissions:", error);
    throw error;
  }
};

// Get active staff members
export const getActiveStaff = async () => {
  try {
    const usersRef = collection(db, "users");
    const q = query(
      usersRef,
      where("role", "==", "staff"),
      where("active", "==", true),
      orderBy("name")
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
  } catch (error) {
    console.error("Error getting active staff:", error);
    throw error;
  }
};

// Check if user exists by email
export const checkUserExists = async (email) => {
  try {
    const usersRef = collection(db, "users");
    const q = query(usersRef, where("email", "==", email));
    const snapshot = await getDocs(q);
    return !snapshot.empty;
  } catch (error) {
    console.error("Error checking user exists:", error);
    throw error;
  }
};
