import {
  collection,
  doc,
  getDocs,
  getDoc,
  setDoc,
  updateDoc,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "../config/firebase";

const BANNER_COLLECTION = "siteBanner";
const BANNER_DOC_ID = "homeBanner";

// Get the current banner
export const getBanner = async () => {
  try {
    const bannerDoc = doc(db, BANNER_COLLECTION, BANNER_DOC_ID);
    const bannerSnap = await getDoc(bannerDoc);

    if (bannerSnap.exists()) {
      return {
        id: bannerSnap.id,
        ...bannerSnap.data(),
      };
    }

    // Return default banner if not exists
    return {
      id: BANNER_DOC_ID,
      isActive: false,
      title: "",
      description: "",
      imageUrl: "",
      link: "",
      buttonText: "",
    };
  } catch (error) {
    console.error("Error fetching banner:", error);
    throw error;
  }
};

// Update or create banner
export const updateBanner = async (bannerData) => {
  try {
    const bannerDoc = doc(db, BANNER_COLLECTION, BANNER_DOC_ID);

    await setDoc(
      bannerDoc,
      {
        ...bannerData,
        updatedAt: serverTimestamp(),
      },
      { merge: true }
    );

    return BANNER_DOC_ID;
  } catch (error) {
    console.error("Error updating banner:", error);
    throw error;
  }
};

// Toggle banner active status
export const toggleBannerStatus = async (isActive) => {
  try {
    const bannerDoc = doc(db, BANNER_COLLECTION, BANNER_DOC_ID);

    await updateDoc(bannerDoc, {
      isActive,
      updatedAt: serverTimestamp(),
    });

    return BANNER_DOC_ID;
  } catch (error) {
    console.error("Error toggling banner status:", error);
    throw error;
  }
};
