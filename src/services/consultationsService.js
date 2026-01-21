import {
  collection,
  doc,
  getDocs,
  getDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "../config/firebase";

const CONSULTATIONS_COLLECTION = "consultations";

// Generate unique consultation ID
const generateConsultationId = () => {
  const timestamp = Date.now();
  const random = Math.floor(Math.random() * 1000);
  return `CONS-${timestamp}-${random}`;
};

// Get all consultations
export const getAllConsultations = async () => {
  try {
    const consultationsCollection = collection(db, CONSULTATIONS_COLLECTION);
    const consultationsQuery = query(
      consultationsCollection,
      orderBy("createdAt", "desc")
    );
    const snapshot = await getDocs(consultationsQuery);

    const consultations = [];
    snapshot.forEach((doc) => {
      consultations.push({
        id: doc.id,
        ...doc.data(),
      });
    });

    return consultations;
  } catch (error) {
    console.error("Error fetching consultations:", error);
    throw error;
  }
};

// Get consultations by customer ID
export const getConsultationsByCustomer = async (customerId) => {
  try {
    const consultationsCollection = collection(db, CONSULTATIONS_COLLECTION);
    const consultationsQuery = query(
      consultationsCollection,
      where("customerId", "==", customerId),
      orderBy("createdAt", "desc")
    );
    const snapshot = await getDocs(consultationsQuery);

    const consultations = [];
    snapshot.forEach((doc) => {
      consultations.push({
        id: doc.id,
        ...doc.data(),
      });
    });

    return consultations;
  } catch (error) {
    console.error("Error fetching customer consultations:", error);
    throw error;
  }
};

// Get consultations by staff ID
export const getConsultationsByStaff = async (staffId) => {
  try {
    const consultationsCollection = collection(db, CONSULTATIONS_COLLECTION);
    const consultationsQuery = query(
      consultationsCollection,
      where("staffId", "==", staffId),
      orderBy("createdAt", "desc")
    );
    const snapshot = await getDocs(consultationsQuery);

    const consultations = [];
    snapshot.forEach((doc) => {
      consultations.push({
        id: doc.id,
        ...doc.data(),
      });
    });

    return consultations;
  } catch (error) {
    console.error("Error fetching staff consultations:", error);
    throw error;
  }
};

// Get consultations by date
export const getConsultationsByDate = async (date) => {
  try {
    const consultationsCollection = collection(db, CONSULTATIONS_COLLECTION);
    const consultationsQuery = query(
      consultationsCollection,
      where("date", "==", date)
    );
    const snapshot = await getDocs(consultationsQuery);

    const consultations = [];
    snapshot.forEach((doc) => {
      consultations.push({
        id: doc.id,
        ...doc.data(),
      });
    });

    return consultations;
  } catch (error) {
    console.error("Error fetching consultations by date:", error);
    throw error;
  }
};

// Create a new consultation
export const createConsultation = async (consultationData) => {
  try {
    const consultationId = generateConsultationId();
    const consultationsCollection = collection(db, CONSULTATIONS_COLLECTION);

    const newConsultation = {
      consultationId,
      ...consultationData,
      status: consultationData.status || "في الانتظار",
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };

    const docRef = await addDoc(consultationsCollection, newConsultation);
    return { id: docRef.id, ...newConsultation };
  } catch (error) {
    console.error("Error creating consultation:", error);
    throw error;
  }
};

// Update consultation
export const updateConsultation = async (consultationId, updates) => {
  try {
    const consultationRef = doc(db, CONSULTATIONS_COLLECTION, consultationId);
    await updateDoc(consultationRef, {
      ...updates,
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    console.error("Error updating consultation:", error);
    throw error;
  }
};

// Delete consultation
export const deleteConsultation = async (consultationId) => {
  try {
    const consultationRef = doc(db, CONSULTATIONS_COLLECTION, consultationId);
    await deleteDoc(consultationRef);
  } catch (error) {
    console.error("Error deleting consultation:", error);
    throw error;
  }
};

// Update consultation status
export const updateConsultationStatus = async (consultationId, status) => {
  try {
    const consultationRef = doc(db, CONSULTATIONS_COLLECTION, consultationId);
    await updateDoc(consultationRef, {
      status,
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    console.error("Error updating consultation status:", error);
    throw error;
  }
};

// Confirm consultation
export const confirmConsultation = async (consultationId) => {
  try {
    const consultationRef = doc(db, CONSULTATIONS_COLLECTION, consultationId);
    await updateDoc(consultationRef, {
      status: "مؤكد",
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    console.error("Error confirming consultation:", error);
    throw error;
  }
};

// Complete consultation
export const completeConsultation = async (
  consultationId,
  customerNote,
  staffNote
) => {
  try {
    const consultationRef = doc(db, CONSULTATIONS_COLLECTION, consultationId);
    await updateDoc(consultationRef, {
      status: "مكتمل",
      customerNote: customerNote || "",
      staffNote: staffNote || "",
      completedAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    console.error("Error completing consultation:", error);
    throw error;
  }
};

// Cancel consultation
export const cancelConsultation = async (consultationId, reason = "") => {
  try {
    const consultationRef = doc(db, CONSULTATIONS_COLLECTION, consultationId);
    await updateDoc(consultationRef, {
      status: "ملغي",
      cancellationReason: reason,
      cancelledAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    console.error("Error cancelling consultation:", error);
    throw error;
  }
};

// Assign staff to consultation
export const assignStaffToConsultation = async (
  consultationId,
  staffId,
  staffName
) => {
  try {
    const consultationRef = doc(db, CONSULTATIONS_COLLECTION, consultationId);
    await updateDoc(consultationRef, {
      staffId,
      staffName,
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    console.error("Error assigning staff to consultation:", error);
    throw error;
  }
};

// Check staff availability for consultations
export const checkStaffAvailabilityForConsultation = async (
  staffId,
  date,
  timeSlot
) => {
  try {
    const consultationsCollection = collection(db, CONSULTATIONS_COLLECTION);
    const consultationsQuery = query(
      consultationsCollection,
      where("staffId", "==", staffId),
      where("date", "==", date),
      where("timeSlot", "==", timeSlot),
      where("status", "in", ["في الانتظار", "مؤكد"])
    );
    const snapshot = await getDocs(consultationsQuery);
    return snapshot.empty; // Return true if available (no conflicting consultations)
  } catch (error) {
    console.error("Error checking staff availability:", error);
    throw error;
  }
};
