import {
  collection,
  addDoc,
  getDocs,
  doc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  Timestamp,
  getDoc,
} from "firebase/firestore";
import { db } from "../config/firebase";

const FEEDBACK_COLLECTION = "feedbacks";

// Feedback types
export const FEEDBACK_TYPES = {
  GENERAL: "general",
  PRODUCT: "product",
};

// Feedback status
export const FEEDBACK_STATUS = {
  PENDING: "pending",
  APPROVED: "approved",
  REJECTED: "rejected",
};

/**
 * Create a new feedback
 * @param {Object} feedbackData - Feedback data
 * @returns {Promise<string>} - Created feedback ID
 */
export const createFeedback = async (feedbackData) => {
  try {
    const feedback = {
      ...feedbackData,
      status: FEEDBACK_STATUS.PENDING,
      isVisible: false,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    };

    const docRef = await addDoc(collection(db, FEEDBACK_COLLECTION), feedback);
    return docRef.id;
  } catch (error) {
    console.error("Error creating feedback:", error);
    throw error;
  }
};

/**
 * Get all feedbacks (for admin)
 * @returns {Promise<Array>} - Array of all feedbacks
 */
export const getAllFeedbacks = async () => {
  try {
    const q = query(
      collection(db, FEEDBACK_COLLECTION),
      orderBy("createdAt", "desc")
    );
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));
  } catch (error) {
    console.error("Error getting all feedbacks:", error);
    throw error;
  }
};

/**
 * Get approved and visible general feedbacks (for homepage)
 * @returns {Promise<Array>} - Array of approved general feedbacks
 */
export const getApprovedGeneralFeedbacks = async () => {
  try {
    const q = query(
      collection(db, FEEDBACK_COLLECTION),
      where("type", "==", FEEDBACK_TYPES.GENERAL),
      where("status", "==", FEEDBACK_STATUS.APPROVED),
      where("isVisible", "==", true),
      orderBy("createdAt", "desc")
    );
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));
  } catch (error) {
    console.error("Error getting approved general feedbacks:", error);
    throw error;
  }
};

/**
 * Get approved and visible product feedbacks for a specific product
 * @param {string} productId - Product ID
 * @returns {Promise<Array>} - Array of approved product feedbacks
 */
export const getApprovedProductFeedbacks = async (productId) => {
  try {
    const q = query(
      collection(db, FEEDBACK_COLLECTION),
      where("type", "==", FEEDBACK_TYPES.PRODUCT),
      where("productId", "==", productId),
      where("status", "==", FEEDBACK_STATUS.APPROVED),
      where("isVisible", "==", true),
      orderBy("createdAt", "desc")
    );
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));
  } catch (error) {
    console.error("Error getting approved product feedbacks:", error);
    throw error;
  }
};

/**
 * Get feedbacks by user
 * @param {string} userId - User ID
 * @returns {Promise<Array>} - Array of user feedbacks
 */
export const getUserFeedbacks = async (userId) => {
  try {
    const q = query(
      collection(db, FEEDBACK_COLLECTION),
      where("userId", "==", userId),
      orderBy("createdAt", "desc")
    );
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));
  } catch (error) {
    console.error("Error getting user feedbacks:", error);
    throw error;
  }
};

/**
 * Update feedback
 * @param {string} feedbackId - Feedback ID
 * @param {Object} updates - Fields to update
 * @returns {Promise<void>}
 */
export const updateFeedback = async (feedbackId, updates) => {
  try {
    const feedbackRef = doc(db, FEEDBACK_COLLECTION, feedbackId);
    await updateDoc(feedbackRef, {
      ...updates,
      updatedAt: Timestamp.now(),
    });
  } catch (error) {
    console.error("Error updating feedback:", error);
    throw error;
  }
};

/**
 * Approve feedback
 * @param {string} feedbackId - Feedback ID
 * @param {boolean} isVisible - Whether to make it visible
 * @returns {Promise<void>}
 */
export const approveFeedback = async (feedbackId, isVisible = true) => {
  try {
    // Get feedback to check if it's a product feedback
    const feedbackRef = doc(db, FEEDBACK_COLLECTION, feedbackId);
    const feedbackSnap = await getDoc(feedbackRef);
    const feedback = feedbackSnap.data();

    await updateFeedback(feedbackId, {
      status: FEEDBACK_STATUS.APPROVED,
      isVisible: isVisible,
    });

    // Update product rating if it's a product feedback
    if (
      feedback &&
      feedback.type === FEEDBACK_TYPES.PRODUCT &&
      feedback.productId
    ) {
      await updateProductRating(feedback.productId);
    }
  } catch (error) {
    console.error("Error approving feedback:", error);
    throw error;
  }
};

/**
 * Reject feedback
 * @param {string} feedbackId - Feedback ID
 * @returns {Promise<void>}
 */
export const rejectFeedback = async (feedbackId) => {
  try {
    // Get feedback to check if it's a product feedback
    const feedbackRef = doc(db, FEEDBACK_COLLECTION, feedbackId);
    const feedbackSnap = await getDoc(feedbackRef);
    const feedback = feedbackSnap.data();

    await updateFeedback(feedbackId, {
      status: FEEDBACK_STATUS.REJECTED,
      isVisible: false,
    });

    // Update product rating if it's a product feedback
    if (
      feedback &&
      feedback.type === FEEDBACK_TYPES.PRODUCT &&
      feedback.productId
    ) {
      await updateProductRating(feedback.productId);
    }
  } catch (error) {
    console.error("Error rejecting feedback:", error);
    throw error;
  }
};

/**
 * Toggle feedback visibility
 * @param {string} feedbackId - Feedback ID
 * @param {boolean} isVisible - Visibility status
 * @returns {Promise<void>}
 */
export const toggleFeedbackVisibility = async (feedbackId, isVisible) => {
  try {
    // Get feedback to check if it's a product feedback
    const feedbackRef = doc(db, FEEDBACK_COLLECTION, feedbackId);
    const feedbackSnap = await getDoc(feedbackRef);
    const feedback = feedbackSnap.data();

    await updateFeedback(feedbackId, { isVisible });

    // Update product rating if it's a product feedback
    if (
      feedback &&
      feedback.type === FEEDBACK_TYPES.PRODUCT &&
      feedback.productId
    ) {
      await updateProductRating(feedback.productId);
    }
  } catch (error) {
    console.error("Error toggling feedback visibility:", error);
    throw error;
  }
};

/**
 * Delete feedback
 * @param {string} feedbackId - Feedback ID
 * @returns {Promise<void>}
 */
export const deleteFeedback = async (feedbackId) => {
  try {
    // Get feedback to check if it's a product feedback before deleting
    const feedbackRef = doc(db, FEEDBACK_COLLECTION, feedbackId);
    const feedbackSnap = await getDoc(feedbackRef);
    const feedback = feedbackSnap.data();

    await deleteDoc(doc(db, FEEDBACK_COLLECTION, feedbackId));

    // Update product rating if it was a product feedback
    if (
      feedback &&
      feedback.type === FEEDBACK_TYPES.PRODUCT &&
      feedback.productId
    ) {
      await updateProductRating(feedback.productId);
    }
  } catch (error) {
    console.error("Error deleting feedback:", error);
    throw error;
  }
};

/**
 * Get feedback statistics
 * @returns {Promise<Object>} - Feedback statistics
 */
export const getFeedbackStats = async () => {
  try {
    const allFeedbacks = await getAllFeedbacks();

    const stats = {
      total: allFeedbacks.length,
      pending: allFeedbacks.filter((f) => f.status === FEEDBACK_STATUS.PENDING)
        .length,
      approved: allFeedbacks.filter(
        (f) => f.status === FEEDBACK_STATUS.APPROVED
      ).length,
      rejected: allFeedbacks.filter(
        (f) => f.status === FEEDBACK_STATUS.REJECTED
      ).length,
      visible: allFeedbacks.filter((f) => f.isVisible).length,
      hidden: allFeedbacks.filter((f) => !f.isVisible).length,
      general: allFeedbacks.filter((f) => f.type === FEEDBACK_TYPES.GENERAL)
        .length,
      product: allFeedbacks.filter((f) => f.type === FEEDBACK_TYPES.PRODUCT)
        .length,
    };

    return stats;
  } catch (error) {
    console.error("Error getting feedback stats:", error);
    throw error;
  }
};

/**
 * Update product rating and reviewsCount based on approved feedbacks
 * @param {string} productId - Product ID
 * @returns {Promise<void>}
 */
export const updateProductRating = async (productId) => {
  try {
    // Get all approved and visible feedbacks for this product
    const feedbacks = await getApprovedProductFeedbacks(productId);

    if (feedbacks.length === 0) {
      // No feedbacks, set rating to 0 and reviewsCount to 0
      const productRef = doc(db, "products", productId);
      await updateDoc(productRef, {
        rating: 0,
        reviewsCount: 0,
      });
      return;
    }

    // Calculate average rating
    const totalRating = feedbacks.reduce(
      (sum, feedback) => sum + feedback.rating,
      0
    );
    const averageRating = (totalRating / feedbacks.length).toFixed(1);

    // Update product
    const productRef = doc(db, "products", productId);
    await updateDoc(productRef, {
      rating: parseFloat(averageRating),
      reviewsCount: feedbacks.length,
    });
  } catch (error) {
    console.error("Error updating product rating:", error);
    throw error;
  }
};
