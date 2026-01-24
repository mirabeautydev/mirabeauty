import {
  collection,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  getDocs,
  getDoc,
  query,
  where,
  Timestamp,
} from "firebase/firestore";
import { db } from "../config/firebase";
import { isExpiredInPalestine } from "../utils/palestineTime";

const COUPONS_COLLECTION = "coupons";

/**
 * Get all coupons
 */
export const getAllCoupons = async () => {
  try {
    const couponsSnapshot = await getDocs(collection(db, COUPONS_COLLECTION));
    const coupons = couponsSnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
      expiryDate: doc.data().expiryDate?.toDate?.() || doc.data().expiryDate,
      createdAt: doc.data().createdAt?.toDate?.() || doc.data().createdAt,
    }));
    return coupons;
  } catch (error) {
    console.error("Error fetching coupons:", error);
    throw error;
  }
};

/**
 * Get active coupons only (not expired) - using Palestine timezone
 */
export const getActiveCoupons = async () => {
  try {
    const couponsSnapshot = await getDocs(collection(db, COUPONS_COLLECTION));
    const coupons = couponsSnapshot.docs
      .map((doc) => ({
        id: doc.id,
        ...doc.data(),
        expiryDate: doc.data().expiryDate?.toDate?.() || doc.data().expiryDate,
        createdAt: doc.data().createdAt?.toDate?.() || doc.data().createdAt,
      }))
      .filter((coupon) => {
        return !isExpiredInPalestine(coupon.expiryDate) && coupon.active !== false;
      });
    return coupons;
  } catch (error) {
    console.error("Error fetching active coupons:", error);
    throw error;
  }
};

/**
 * Get coupon by code
 */
export const getCouponByCode = async (code) => {
  try {
    const q = query(
      collection(db, COUPONS_COLLECTION),
      where("code", "==", code.toUpperCase())
    );
    const snapshot = await getDocs(q);

    if (snapshot.empty) {
      return null;
    }

    const doc = snapshot.docs[0];
    return {
      id: doc.id,
      ...doc.data(),
      expiryDate: doc.data().expiryDate?.toDate?.() || doc.data().expiryDate,
      createdAt: doc.data().createdAt?.toDate?.() || doc.data().createdAt,
    };
  } catch (error) {
    console.error("Error fetching coupon by code:", error);
    throw error;
  }
};

/**
 * Validate coupon
 */
export const validateCoupon = async (code, type, categoryIds = []) => {
  try {
    const coupon = await getCouponByCode(code);

    if (!coupon) {
      return { valid: false, error: "الكوبون غير موجود" };
    }

    // Check if coupon is active
    if (coupon.active === false) {
      return { valid: false, error: "الكوبون غير نشط" };
    }

    // Check expiry date using Palestine timezone
    if (isExpiredInPalestine(coupon.expiryDate)) {
      return { valid: false, error: "انتهت صلاحية الكوبون" };
    }

    // Check type match - allow 'both' type to work for both products and services
    if (coupon.type !== type && coupon.type !== "both") {
      return {
        valid: false,
        error: `هذا الكوبون خاص بـ ${
          coupon.type === "products" 
            ? "المنتجات" 
            : coupon.type === "services"
            ? "الخدمات"
            : "المنتجات والخدمات"
        } فقط`,
      };
    }

    // For service coupons (not 'both' type), check if any category matches
    if (
      type === "services" &&
      coupon.type === "services" &&
      coupon.categories &&
      coupon.categories.length > 0
    ) {
      const hasMatch = categoryIds.some((catId) =>
        coupon.categories.includes(catId)
      );
      if (!hasMatch) {
        return {
          valid: false,
          error: "هذا الكوبون غير صالح لهذه الفئة من الخدمات",
        };
      }
    }

    return {
      valid: true,
      coupon: coupon,
    };
  } catch (error) {
    console.error("Error validating coupon:", error);
    return { valid: false, error: "حدث خطأ في التحقق من الكوبون" };
  }
};

/**
 * Add new coupon
 */
export const addCoupon = async (couponData) => {
  try {
    const coupon = {
      ...couponData,
      code: couponData.code.toUpperCase(),
      expiryDate: Timestamp.fromDate(new Date(couponData.expiryDate)),
      createdAt: Timestamp.fromDate(new Date()),
      active: true,
    };

    const docRef = await addDoc(collection(db, COUPONS_COLLECTION), coupon);
    return { id: docRef.id, ...coupon };
  } catch (error) {
    console.error("Error adding coupon:", error);
    throw error;
  }
};

/**
 * Update coupon
 */
export const updateCoupon = async (couponId, couponData) => {
  try {
    const couponRef = doc(db, COUPONS_COLLECTION, couponId);
    const updateData = {
      ...couponData,
      code: couponData.code.toUpperCase(),
    };

    if (couponData.expiryDate) {
      updateData.expiryDate = Timestamp.fromDate(
        new Date(couponData.expiryDate)
      );
    }

    await updateDoc(couponRef, updateData);
  } catch (error) {
    console.error("Error updating coupon:", error);
    throw error;
  }
};

/**
 * Toggle coupon active status
 */
export const toggleCouponStatus = async (couponId, active) => {
  try {
    const couponRef = doc(db, COUPONS_COLLECTION, couponId);
    await updateDoc(couponRef, { active });
  } catch (error) {
    console.error("Error toggling coupon status:", error);
    throw error;
  }
};

/**
 * Delete coupon
 */
export const deleteCoupon = async (couponId) => {
  try {
    await deleteDoc(doc(db, COUPONS_COLLECTION, couponId));
  } catch (error) {
    console.error("Error deleting coupon:", error);
    throw error;
  }
};
