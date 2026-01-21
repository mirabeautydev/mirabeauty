/**
 * Reset Analytics Data Utility
 * WARNING: This will permanently delete data. Use with caution!
 * Only use this before going live to clear dev/test data.
 */

import {
  collection,
  getDocs,
  deleteDoc,
  doc,
  query,
  where,
} from "firebase/firestore";
import { ref, remove } from "firebase/database";
import { db, database } from "../config/firebase";

/**
 * Reset visitors data from Realtime Database
 */
export const resetVisitorsData = async () => {
  try {
    const visitorsRef = ref(database, "visitors");
    await remove(visitorsRef);
    return { success: true, message: "تم مسح بيانات الزوار" };
  } catch (error) {
    console.error("Error clearing visitors:", error);
    return { success: false, message: "خطأ في مسح بيانات الزوار" };
  }
};

/**
 * Reset presence tracking data from Realtime Database
 */
export const resetPresenceData = async () => {
  try {
    const presenceRef = ref(database, "presence");
    const anonymousPresenceRef = ref(database, "anonymousPresence");

    await Promise.all([remove(presenceRef), remove(anonymousPresenceRef)]);

    return { success: true, message: "تم مسح بيانات التواجد" };
  } catch (error) {
    console.error("Error clearing presence:", error);
    return { success: false, message: "خطأ في مسح بيانات التواجد" };
  }
};

/**
 * Delete all orders (optional - keeps completed orders by default)
 */
export const resetOrdersData = async (deleteAll = false) => {
  try {
    const ordersRef = collection(db, "orders");
    let q = ordersRef;

    // By default, only delete pending/cancelled orders, keep completed ones
    if (!deleteAll) {
      q = query(
        ordersRef,
        where("status", "in", ["pending", "processing", "cancelled"])
      );
    }

    const snapshot = await getDocs(q);
    const deletePromises = snapshot.docs.map((docSnapshot) =>
      deleteDoc(doc(db, "orders", docSnapshot.id))
    );

    await Promise.all(deletePromises);
    return {
      success: true,
      message: `تم مسح ${snapshot.size} طلب`,
      count: snapshot.size,
    };
  } catch (error) {
    console.error("Error clearing orders:", error);
    return { success: false, message: "خطأ في مسح الطلبات" };
  }
};

/**
 * Delete all appointments (optional - keeps completed appointments by default)
 */
export const resetAppointmentsData = async (deleteAll = false) => {
  try {
    const appointmentsRef = collection(db, "appointments");
    let q = appointmentsRef;

    // By default, only delete pending/cancelled appointments
    if (!deleteAll) {
      q = query(
        appointmentsRef,
        where("status", "in", ["pending", "cancelled"])
      );
    }

    const snapshot = await getDocs(q);
    const deletePromises = snapshot.docs.map((docSnapshot) =>
      deleteDoc(doc(db, "appointments", docSnapshot.id))
    );

    await Promise.all(deletePromises);
    return {
      success: true,
      message: `تم مسح ${snapshot.size} موعد`,
      count: snapshot.size,
    };
  } catch (error) {
    console.error("Error clearing appointments:", error);
    return { success: false, message: "خطأ في مسح المواعيد" };
  }
};

/**
 * Delete test users (keep admin/staff accounts)
 */
export const resetTestUsers = async () => {
  try {
    const usersRef = collection(db, "users");
    const q = query(usersRef, where("role", "==", "customer"));

    const snapshot = await getDocs(q);
    const deletePromises = snapshot.docs.map((docSnapshot) =>
      deleteDoc(doc(db, "users", docSnapshot.id))
    );

    await Promise.all(deletePromises);
    return {
      success: true,
      message: `تم مسح ${snapshot.size} مستخدم تجريبي`,
      count: snapshot.size,
    };
  } catch (error) {
    console.error("Error clearing test users:", error);
    return { success: false, message: "خطأ في مسح المستخدمين التجريبيين" };
  }
};

/**
 * Reset all analytics data at once
 */
export const resetAllAnalyticsData = async (options = {}) => {
  const {
    includeOrders = false,
    includeAppointments = false,
    includeUsers = false,
    deleteCompletedOrders = false,
    deleteCompletedAppointments = false,
  } = options;

  const results = [];

  // Always clear visitors and presence data
  results.push(await resetVisitorsData());
  results.push(await resetPresenceData());

  // Optional: Clear orders
  if (includeOrders) {
    results.push(await resetOrdersData(deleteCompletedOrders));
  }

  // Optional: Clear appointments
  if (includeAppointments) {
    results.push(await resetAppointmentsData(deleteCompletedAppointments));
  }

  // Optional: Clear test users
  if (includeUsers) {
    results.push(await resetTestUsers());
  }

  return results;
};

/**
 * Safe reset - Only clears visitor tracking data
 * Recommended for going live
 */
export const safeResetForProduction = async () => {
  const results = await Promise.all([resetVisitorsData(), resetPresenceData()]);

  const allSuccess = results.every((r) => r.success);

  if (allSuccess) {
    // Clear localStorage sessionData so next visit counts as new visitor
    localStorage.removeItem("sessionData");
    return {
      success: true,
      message: "تم إعادة تعيين بيانات التحليلات بنجاح",
    };
  } else {
    return {
      success: false,
      message: "حدثت بعض الأخطاء أثناء إعادة التعيين",
    };
  }
};
