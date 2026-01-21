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

const GIFTS_COLLECTION = "gifts";

// Get all gifts
export const getAllGifts = async () => {
  try {
    const giftsCollection = collection(db, GIFTS_COLLECTION);
    const giftsQuery = query(giftsCollection, orderBy("createdAt", "desc"));
    const snapshot = await getDocs(giftsQuery);

    const gifts = [];
    snapshot.forEach((doc) => {
      gifts.push({
        id: doc.id,
        ...doc.data(),
      });
    });

    return gifts;
  } catch (error) {
    console.error("Error fetching gifts:", error);
    throw error;
  }
};

// Get gift by ID
export const getGiftById = async (giftId) => {
  try {
    const giftDoc = doc(db, GIFTS_COLLECTION, giftId);
    const giftSnapshot = await getDoc(giftDoc);

    if (giftSnapshot.exists()) {
      return {
        id: giftSnapshot.id,
        ...giftSnapshot.data(),
      };
    } else {
      throw new Error("Gift not found");
    }
  } catch (error) {
    console.error("Error fetching gift:", error);
    throw error;
  }
};

// Add new gift
export const addGift = async (giftData) => {
  try {
    const giftsCollection = collection(db, GIFTS_COLLECTION);
    const docRef = await addDoc(giftsCollection, {
      ...giftData,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    return docRef.id;
  } catch (error) {
    console.error("Error adding gift:", error);
    throw error;
  }
};

// Update gift
export const updateGift = async (giftId, giftData) => {
  try {
    const giftDoc = doc(db, GIFTS_COLLECTION, giftId);
    await updateDoc(giftDoc, {
      ...giftData,
      updatedAt: serverTimestamp(),
    });

    return giftId;
  } catch (error) {
    console.error("Error updating gift:", error);
    throw error;
  }
};

// Delete gift
export const deleteGift = async (giftId) => {
  try {
    const giftDoc = doc(db, GIFTS_COLLECTION, giftId);
    await deleteDoc(giftDoc);
  } catch (error) {
    console.error("Error deleting gift:", error);
    throw error;
  }
};
