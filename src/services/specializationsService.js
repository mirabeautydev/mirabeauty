// Specializations Service - Manage staff specializations in Firestore
import {
  collection,
  doc,
  getDocs,
  getDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  orderBy,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "../config/firebase";

const COLLECTION_NAME = "specializations";

// Get all specializations
export const getAllSpecializations = async () => {
  try {
    const q = query(collection(db, COLLECTION_NAME), orderBy("order", "asc"));
    const querySnapshot = await getDocs(q);
    const specializations = [];
    querySnapshot.forEach((doc) => {
      specializations.push({ id: doc.id, ...doc.data() });
    });
    return specializations;
  } catch (error) {
    console.error("Error getting specializations:", error);
    throw error;
  }
};

// Get specialization by ID
export const getSpecializationById = async (specializationId) => {
  try {
    const docRef = doc(db, COLLECTION_NAME, specializationId);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      return { id: docSnap.id, ...docSnap.data() };
    } else {
      throw new Error("Specialization not found");
    }
  } catch (error) {
    console.error("Error getting specialization:", error);
    throw error;
  }
};

// Add new specialization
export const addSpecialization = async (specializationData) => {
  try {
    // Get current specializations count for order
    const specializations = await getAllSpecializations();
    const newOrder = specializations.length;

    const docRef = await addDoc(collection(db, COLLECTION_NAME), {
      ...specializationData,
      order: newOrder,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    return docRef.id;
  } catch (error) {
    console.error("Error adding specialization:", error);
    throw error;
  }
};

// Update specialization
export const updateSpecialization = async (specializationId, updateData) => {
  try {
    const docRef = doc(db, COLLECTION_NAME, specializationId);
    await updateDoc(docRef, {
      ...updateData,
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    console.error("Error updating specialization:", error);
    throw error;
  }
};

// Delete specialization
export const deleteSpecialization = async (specializationId) => {
  try {
    const docRef = doc(db, COLLECTION_NAME, specializationId);
    await deleteDoc(docRef);
  } catch (error) {
    console.error("Error deleting specialization:", error);
    throw error;
  }
};

// Reorder specializations
export const reorderSpecializations = async (specializations) => {
  try {
    const batch = [];
    for (let i = 0; i < specializations.length; i++) {
      const specRef = doc(db, COLLECTION_NAME, specializations[i].id);
      batch.push(
        updateDoc(specRef, {
          order: i,
          updatedAt: serverTimestamp(),
        })
      );
    }
    await Promise.all(batch);
    return specializations;
  } catch (error) {
    console.error("Error reordering specializations:", error);
    throw error;
  }
};
