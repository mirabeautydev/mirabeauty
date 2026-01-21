// Skin Types Service - Manage skin types in Firestore
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

const COLLECTION_NAME = "skinTypes";

// Get all skin types
export const getAllSkinTypes = async () => {
  try {
    const q = query(collection(db, COLLECTION_NAME), orderBy("order", "asc"));
    const querySnapshot = await getDocs(q);
    const skinTypes = [];
    querySnapshot.forEach((doc) => {
      skinTypes.push({ id: doc.id, ...doc.data() });
    });
    return skinTypes;
  } catch (error) {
    console.error("Error getting skin types:", error);
    throw error;
  }
};

// Get skin type by ID
export const getSkinTypeById = async (skinTypeId) => {
  try {
    const docRef = doc(db, COLLECTION_NAME, skinTypeId);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      return { id: docSnap.id, ...docSnap.data() };
    } else {
      throw new Error("Skin type not found");
    }
  } catch (error) {
    console.error("Error getting skin type:", error);
    throw error;
  }
};

// Add new skin type
export const addSkinType = async (skinTypeData) => {
  try {
    // Get current skin types count for order
    const skinTypes = await getAllSkinTypes();
    const newOrder = skinTypes.length;

    const docRef = await addDoc(collection(db, COLLECTION_NAME), {
      ...skinTypeData,
      order: newOrder,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    return docRef.id;
  } catch (error) {
    console.error("Error adding skin type:", error);
    throw error;
  }
};

// Update skin type
export const updateSkinType = async (skinTypeId, updateData) => {
  try {
    const docRef = doc(db, COLLECTION_NAME, skinTypeId);
    await updateDoc(docRef, {
      ...updateData,
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    console.error("Error updating skin type:", error);
    throw error;
  }
};

// Delete skin type
export const deleteSkinType = async (skinTypeId) => {
  try {
    const docRef = doc(db, COLLECTION_NAME, skinTypeId);
    await deleteDoc(docRef);
  } catch (error) {
    console.error("Error deleting skin type:", error);
    throw error;
  }
};
