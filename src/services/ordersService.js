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
  limit,
  startAfter,
  getDoc,
  Timestamp,
} from "firebase/firestore";
import { db } from "../config/firebase";

const ORDERS_COLLECTION = "orders";

// Order status constants
export const ORDER_STATUS = {
  PENDING: "pending",
  CONFIRMED: "confirmed",
  CANCELLED: "cancelled",
};

// Order status display text in Arabic
export const ORDER_STATUS_DISPLAY = {
  pending: "في الانتظار",
  confirmed: "مؤكد",
  cancelled: "ملغي",
};

// Delivery areas with prices
export const DELIVERY_AREAS = {
  WEST_BANK: { name: "الضفة الغربية", price: 20 },
  JERUSALEM: { name: "القدس", price: 30 },
  OCCUPIED_INTERIOR: { name: "الداخل المحتل", price: 70 },
};

// Create a new order
export const createOrder = async (orderData) => {
  try {
    const order = {
      ...orderData,
      status: ORDER_STATUS.PENDING,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
      orderNumber: generateOrderNumber(),
    };

    const docRef = await addDoc(collection(db, ORDERS_COLLECTION), order);
    return { id: docRef.id, ...order };
  } catch (error) {
    console.error("Error creating order:", error);
    throw new Error("فشل في إنشاء الطلب");
  }
};

// Get orders for a specific user
export const getUserOrders = async (userId) => {
  try {
    const q = query(
      collection(db, ORDERS_COLLECTION),
      where("userId", "==", userId),
      orderBy("createdAt", "desc")
    );

    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));
  } catch (error) {
    console.error("Error fetching user orders:", error);
    throw new Error("فشل في جلب الطلبات");
  }
};

// Get all orders (for admin)
export const getAllOrders = async (
  filters = {},
  pageSize = 10,
  lastDoc = null
) => {
  try {
    let q = collection(db, ORDERS_COLLECTION);

    // Apply filters
    if (filters.status) {
      q = query(q, where("status", "==", filters.status));
    }

    if (filters.isSignedIn !== undefined) {
      q = query(q, where("isSignedIn", "==", filters.isSignedIn));
    }

    if (filters.deliveryArea) {
      q = query(q, where("deliveryArea", "==", filters.deliveryArea));
    }

    // Order by creation date (newest first)
    q = query(q, orderBy("createdAt", "desc"));

    // Pagination
    if (lastDoc) {
      q = query(q, startAfter(lastDoc));
    }

    q = query(q, limit(pageSize));

    const querySnapshot = await getDocs(q);
    const orders = querySnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

    return {
      orders,
      lastDoc: querySnapshot.docs[querySnapshot.docs.length - 1],
      hasMore: querySnapshot.docs.length === pageSize,
    };
  } catch (error) {
    console.error("Error fetching orders:", error);
    throw new Error("فشل في جلب الطلبات");
  }
};

// Get order by ID
export const getOrderById = async (orderId) => {
  try {
    const docRef = doc(db, ORDERS_COLLECTION, orderId);
    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
      return { id: docSnap.id, ...docSnap.data() };
    } else {
      throw new Error("الطلب غير موجود");
    }
  } catch (error) {
    console.error("Error fetching order:", error);
    throw new Error("فشل في جلب الطلب");
  }
};

// Update order status
export const updateOrderStatus = async (orderId, status = "") => {
  try {
    const orderRef = doc(db, ORDERS_COLLECTION, orderId);
    await updateDoc(orderRef, {
      status,
      updatedAt: Timestamp.now(),
    });

    return true;
  } catch (error) {
    console.error("Error updating order status:", error);
    throw new Error("فشل في تحديث حالة الطلب");
  }
};

// Delete order
export const deleteOrder = async (orderId) => {
  try {
    const orderRef = doc(db, ORDERS_COLLECTION, orderId);
    await deleteDoc(orderRef);
    return true;
  } catch (error) {
    console.error("Error deleting order:", error);
    throw new Error("فشل في حذف الطلب");
  }
};

// Generate unique order number
const generateOrderNumber = () => {
  const timestamp = Date.now().toString();
  const random = Math.floor(Math.random() * 1000)
    .toString()
    .padStart(3, "0");
  return `ORD-${timestamp.slice(-6)}${random}`;
};

// Update product quantities when order is confirmed
export const updateProductQuantitiesOnOrderAccept = async (orderItems) => {
  try {
    const PRODUCTS_COLLECTION = "products";
    
    // Update each product's quantity
    for (const item of orderItems) {
      const productRef = doc(db, PRODUCTS_COLLECTION, item.id);
      const productDoc = await getDoc(productRef);
      
      if (productDoc.exists()) {
        const currentData = productDoc.data();
        const currentQuantity = currentData.quantity || 0;
        const newQuantity = Math.max(0, currentQuantity - item.quantity);
        
        await updateDoc(productRef, {
          quantity: newQuantity,
          updatedAt: Timestamp.now(),
        });
      }
    }
    
    return true;
  } catch (error) {
    console.error("Error updating product quantities on order accept:", error);
    throw new Error("فشل في تحديث كميات المنتجات");
  }
};

// Update product quantities when order is cancelled (restore quantities)
export const updateProductQuantitiesOnOrderCancel = async (orderItems) => {
  try {
    const PRODUCTS_COLLECTION = "products";
    
    // Restore each product's quantity
    for (const item of orderItems) {
      const productRef = doc(db, PRODUCTS_COLLECTION, item.id);
      const productDoc = await getDoc(productRef);
      
      if (productDoc.exists()) {
        const currentData = productDoc.data();
        const currentQuantity = currentData.quantity || 0;
        const newQuantity = currentQuantity + item.quantity;
        
        await updateDoc(productRef, {
          quantity: newQuantity,
          updatedAt: Timestamp.now(),
        });
      }
    }
    
    return true;
  } catch (error) {
    console.error("Error updating product quantities on order cancel:", error);
    throw new Error("فشل في استعادة كميات المنتجات");
  }
};

// Get order statistics (for admin dashboard)
export const getOrderStatistics = async () => {
  try {
    const ordersRef = collection(db, ORDERS_COLLECTION);

    // Get all orders
    const allOrdersQuery = await getDocs(ordersRef);
    const totalOrders = allOrdersQuery.size;

    // Get pending orders
    const pendingQuery = query(
      ordersRef,
      where("status", "==", ORDER_STATUS.PENDING)
    );
    const pendingOrders = await getDocs(pendingQuery);

    // Get confirmed orders
    const confirmedQuery = query(
      ordersRef,
      where("status", "==", ORDER_STATUS.CONFIRMED)
    );
    const confirmedOrders = await getDocs(confirmedQuery);

    // Get cancelled orders
    const cancelledQuery = query(
      ordersRef,
      where("status", "==", ORDER_STATUS.CANCELLED)
    );
    const cancelledOrders = await getDocs(cancelledQuery);

    // Calculate total revenue from confirmed orders
    let totalRevenue = 0;
    confirmedOrders.forEach((doc) => {
      const order = doc.data();
      totalRevenue += order.total || 0;
    });

    return {
      totalOrders,
      pendingOrders: pendingOrders.size,
      confirmedOrders: confirmedOrders.size,
      cancelledOrders: cancelledOrders.size,
      totalRevenue,
    };
  } catch (error) {
    console.error("Error fetching order statistics:", error);
    throw new Error("فشل في جلب إحصائيات الطلبات");
  }
};
