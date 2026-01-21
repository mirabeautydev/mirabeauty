import {
  collection,
  query,
  where,
  getDocs,
  orderBy,
  limit,
  Timestamp,
} from "firebase/firestore";
import {
  ref,
  onValue,
  get,
  query as dbQuery,
  orderByKey,
  startAt,
  endAt,
} from "firebase/database";
import { db, database } from "../config/firebase";

// Get total registered users count
export const getTotalUsersCount = async () => {
  try {
    const usersRef = collection(db, "users");
    const snapshot = await getDocs(usersRef);
    return snapshot.size;
  } catch (error) {
    console.error("Error getting users count:", error);
    return 0;
  }
};

// Get total orders count and revenue
export const getOrdersStats = async () => {
  try {
    const ordersRef = collection(db, "orders");
    const snapshot = await getDocs(ordersRef);

    let totalRevenue = 0;
    let completedOrders = 0;
    let pendingOrders = 0;

    snapshot.forEach((doc) => {
      const order = doc.data();
      totalRevenue += order.totalPrice || 0;

      if (order.status === "completed" || order.status === "delivered") {
        completedOrders++;
      } else if (order.status === "pending" || order.status === "processing") {
        pendingOrders++;
      }
    });

    return {
      totalOrders: snapshot.size,
      totalRevenue,
      completedOrders,
      pendingOrders,
    };
  } catch (error) {
    console.error("Error getting orders stats:", error);
    return {
      totalOrders: 0,
      totalRevenue: 0,
      completedOrders: 0,
      pendingOrders: 0,
    };
  }
};

// Get total appointments count
export const getAppointmentsStats = async () => {
  try {
    const appointmentsRef = collection(db, "appointments");
    const snapshot = await getDocs(appointmentsRef);

    let confirmedAppointments = 0;
    let pendingAppointments = 0;
    let completedAppointments = 0;

    snapshot.forEach((doc) => {
      const appointment = doc.data();

      if (appointment.status === "confirmed") {
        confirmedAppointments++;
      } else if (appointment.status === "pending") {
        pendingAppointments++;
      } else if (appointment.status === "completed") {
        completedAppointments++;
      }
    });

    return {
      totalAppointments: snapshot.size,
      confirmedAppointments,
      pendingAppointments,
      completedAppointments,
    };
  } catch (error) {
    console.error("Error getting appointments stats:", error);
    return {
      totalAppointments: 0,
      confirmedAppointments: 0,
      pendingAppointments: 0,
      completedAppointments: 0,
    };
  }
};

// Get popular products
export const getPopularProducts = async (limitCount = 5) => {
  try {
    const ordersRef = collection(db, "orders");
    const snapshot = await getDocs(ordersRef);

    const productCounts = {};

    snapshot.forEach((doc) => {
      const order = doc.data();
      if (order.items && Array.isArray(order.items)) {
        order.items.forEach((item) => {
          if (item.productId) {
            if (!productCounts[item.productId]) {
              productCounts[item.productId] = {
                productId: item.productId,
                name: item.name || "Unknown Product",
                count: 0,
                revenue: 0,
              };
            }
            productCounts[item.productId].count += item.quantity || 1;
            productCounts[item.productId].revenue +=
              (item.price || 0) * (item.quantity || 1);
          }
        });
      }
    });

    // Convert to array and sort by count
    const sortedProducts = Object.values(productCounts)
      .sort((a, b) => b.count - a.count)
      .slice(0, limitCount);

    return sortedProducts;
  } catch (error) {
    console.error("Error getting popular products:", error);
    return [];
  }
};

// Get popular services
export const getPopularServices = async (limitCount = 5) => {
  try {
    const appointmentsRef = collection(db, "appointments");
    const snapshot = await getDocs(appointmentsRef);

    const serviceCounts = {};

    snapshot.forEach((doc) => {
      const appointment = doc.data();
      if (appointment.serviceId) {
        if (!serviceCounts[appointment.serviceId]) {
          serviceCounts[appointment.serviceId] = {
            serviceId: appointment.serviceId,
            name: appointment.serviceName || "Unknown Service",
            count: 0,
          };
        }
        serviceCounts[appointment.serviceId].count += 1;
      }
    });

    // Convert to array and sort by count
    const sortedServices = Object.values(serviceCounts)
      .sort((a, b) => b.count - a.count)
      .slice(0, limitCount);

    return sortedServices;
  } catch (error) {
    console.error("Error getting popular services:", error);
    return [];
  }
};

// Get revenue for last N days
export const getRevenueByDays = async (days = 7) => {
  try {
    const ordersRef = collection(db, "orders");
    const snapshot = await getDocs(ordersRef);

    const revenueByDay = {};
    const now = new Date();

    // Initialize last N days
    for (let i = days - 1; i >= 0; i--) {
      const date = new Date(now);
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split("T")[0];
      revenueByDay[dateStr] = 0;
    }

    snapshot.forEach((doc) => {
      const order = doc.data();
      if (order.createdAt) {
        const orderDate = order.createdAt.toDate();
        const dateStr = orderDate.toISOString().split("T")[0];

        if (revenueByDay.hasOwnProperty(dateStr)) {
          revenueByDay[dateStr] += order.totalPrice || 0;
        }
      }
    });

    // Convert to array format for charts
    return Object.entries(revenueByDay).map(([date, revenue]) => ({
      date,
      revenue,
    }));
  } catch (error) {
    console.error("Error getting revenue by days:", error);
    return [];
  }
};

// Get visitors count for today, this week, this month
export const getVisitorsStats = (callback) => {
  try {
    const today = new Date().toISOString().split("T")[0];
    const visitorsRef = ref(database, `visitors/${today}`);

    return onValue(visitorsRef, (snapshot) => {
      const visitorsData = snapshot.val();
      const todayCount = visitorsData ? Object.keys(visitorsData).length : 0;

      // For now, return today's count
      // You can expand this to track weekly/monthly by reading multiple days
      callback({
        today: todayCount,
        thisWeek: todayCount, // Placeholder
        thisMonth: todayCount, // Placeholder
      });
    });
  } catch (error) {
    console.error("Error getting visitors stats:", error);
    callback({
      today: 0,
      thisWeek: 0,
      thisMonth: 0,
    });
  }
};

// Get active users count in real-time (authenticated only)
export const getActiveUsersCount = (callback) => {
  try {
    const presenceRef = ref(database, "presence");

    return onValue(presenceRef, (snapshot) => {
      const presenceData = snapshot.val();
      let activeCount = 0;

      if (presenceData) {
        Object.values(presenceData).forEach((user) => {
          if (user.online === true) {
            activeCount++;
          }
        });
      }

      callback(activeCount);
    });
  } catch (error) {
    console.error("Error getting active users:", error);
    callback(0);
  }
};

// Get active anonymous users count in real-time
export const getActiveAnonymousUsersCount = (callback) => {
  try {
    const anonymousPresenceRef = ref(database, "anonymousPresence");

    return onValue(anonymousPresenceRef, (snapshot) => {
      const presenceData = snapshot.val();
      let activeCount = 0;

      if (presenceData) {
        Object.values(presenceData).forEach((session) => {
          if (session.online === true) {
            activeCount++;
          }
        });
      }

      callback(activeCount);
    });
  } catch (error) {
    console.error("Error getting active anonymous users:", error);
    callback(0);
  }
};

// Get total active users count (authenticated + anonymous)
export const getTotalActiveUsersCount = (callback) => {
  try {
    let authCount = 0;
    let anonCount = 0;
    let unsubscribeAuth = null;
    let unsubscribeAnon = null;

    const updateTotal = () => {
      callback(authCount + anonCount);
    };

    // Listen to authenticated users
    const presenceRef = ref(database, "presence");
    unsubscribeAuth = onValue(presenceRef, (snapshot) => {
      const presenceData = snapshot.val();
      authCount = 0;

      if (presenceData) {
        Object.values(presenceData).forEach((user) => {
          if (user.online === true) {
            authCount++;
          }
        });
      }

      updateTotal();
    });

    // Listen to anonymous users
    const anonymousPresenceRef = ref(database, "anonymousPresence");
    unsubscribeAnon = onValue(anonymousPresenceRef, (snapshot) => {
      const presenceData = snapshot.val();
      anonCount = 0;

      if (presenceData) {
        Object.values(presenceData).forEach((session) => {
          if (session.online === true) {
            anonCount++;
          }
        });
      }

      updateTotal();
    });

    // Return combined unsubscribe function
    return () => {
      if (unsubscribeAuth) unsubscribeAuth();
      if (unsubscribeAnon) unsubscribeAnon();
    };
  } catch (error) {
    console.error("Error getting total active users:", error);
    callback(0);
  }
};

// Translate status to Arabic
const translateStatus = (status) => {
  const statusMap = {
    pending: "قيد الانتظار",
    processing: "قيد المعالجة",
    completed: "مكتمل",
    delivered: "تم التسليم",
    confirmed: "مؤكد",
    cancelled: "ملغي",
    shipped: "تم الشحن",
    rejected: "مرفوض",
  };
  return statusMap[status] || status;
};

// Get recent activities (orders and appointments)
export const getRecentActivities = async (limitCount = 10) => {
  try {
    const activities = [];

    // Get recent orders
    const ordersRef = collection(db, "orders");
    const ordersQuery = query(
      ordersRef,
      orderBy("createdAt", "desc"),
      limit(5)
    );
    const ordersSnapshot = await getDocs(ordersQuery);

    ordersSnapshot.forEach((doc) => {
      const order = doc.data();
      activities.push({
        id: doc.id,
        type: "order",
        description: `طلب جديد - ${order.total} ₪`,
        timestamp: order.createdAt,
        status: translateStatus(order.status),
      });
    });

    // Get recent appointments
    const appointmentsRef = collection(db, "appointments");
    const appointmentsQuery = query(
      appointmentsRef,
      orderBy("createdAt", "desc"),
      limit(5)
    );
    const appointmentsSnapshot = await getDocs(appointmentsQuery);

    appointmentsSnapshot.forEach((doc) => {
      const appointment = doc.data();
      activities.push({
        id: doc.id,
        type: "appointment",
        description: `موعد جديد - ${appointment.serviceName || "خدمة"}`,
        timestamp: appointment.createdAt,
        status: translateStatus(appointment.status),
      });
    });

    // Sort by timestamp and limit
    activities.sort((a, b) => {
      const timeA = a.timestamp?.toMillis() || 0;
      const timeB = b.timestamp?.toMillis() || 0;
      return timeB - timeA;
    });

    return activities.slice(0, limitCount);
  } catch (error) {
    console.error("Error getting recent activities:", error);
    return [];
  }
};

// Get users stats by time period
export const getUsersStatsByPeriod = async (startDate, endDate) => {
  try {
    const usersRef = collection(db, "users");
    let q = usersRef;

    if (startDate) {
      const startTimestamp = Timestamp.fromDate(startDate);
      q = query(q, where("createdAt", ">=", startTimestamp));
    }

    if (endDate) {
      const endTimestamp = Timestamp.fromDate(endDate);
      q = query(q, where("createdAt", "<=", endTimestamp));
    }

    const snapshot = await getDocs(q);

    let adminCount = 0;
    let staffCount = 0;
    let customerCount = 0;

    snapshot.forEach((doc) => {
      const user = doc.data();
      if (user.role === "admin") adminCount++;
      else if (user.role === "staff") staffCount++;
      else customerCount++;
    });

    return {
      totalUsers: snapshot.size,
      adminCount,
      staffCount,
      customerCount,
    };
  } catch (error) {
    console.error("Error getting users stats by period:", error);
    return {
      totalUsers: 0,
      adminCount: 0,
      staffCount: 0,
      customerCount: 0,
    };
  }
};

// Get orders stats by time period
export const getOrdersStatsByPeriod = async (startDate, endDate) => {
  try {
    const ordersRef = collection(db, "orders");
    let q = ordersRef;

    if (startDate) {
      const startTimestamp = Timestamp.fromDate(startDate);
      q = query(q, where("createdAt", ">=", startTimestamp));
    }

    if (endDate) {
      const endTimestamp = Timestamp.fromDate(endDate);
      q = query(q, where("createdAt", "<=", endTimestamp));
    }

    const snapshot = await getDocs(q);

    let totalRevenue = 0;
    let completedOrders = 0;
    let pendingOrders = 0;
    let cancelledOrders = 0;

    snapshot.forEach((doc) => {
      const order = doc.data();
      totalRevenue += order.totalPrice || 0;

      if (order.status === "completed" || order.status === "delivered") {
        completedOrders++;
      } else if (order.status === "pending" || order.status === "processing") {
        pendingOrders++;
      } else if (order.status === "cancelled") {
        cancelledOrders++;
      }
    });

    return {
      totalOrders: snapshot.size,
      totalRevenue,
      completedOrders,
      pendingOrders,
      cancelledOrders,
      avgOrderValue: snapshot.size > 0 ? totalRevenue / snapshot.size : 0,
    };
  } catch (error) {
    console.error("Error getting orders stats by period:", error);
    return {
      totalOrders: 0,
      totalRevenue: 0,
      completedOrders: 0,
      pendingOrders: 0,
      cancelledOrders: 0,
      avgOrderValue: 0,
    };
  }
};

// Get appointments stats by time period
export const getAppointmentsStatsByPeriod = async (startDate, endDate) => {
  try {
    const appointmentsRef = collection(db, "appointments");
    let q = appointmentsRef;

    if (startDate) {
      const startTimestamp = Timestamp.fromDate(startDate);
      q = query(q, where("createdAt", ">=", startTimestamp));
    }

    if (endDate) {
      const endTimestamp = Timestamp.fromDate(endDate);
      q = query(q, where("createdAt", "<=", endTimestamp));
    }

    const snapshot = await getDocs(q);

    let confirmedAppointments = 0;
    let pendingAppointments = 0;
    let completedAppointments = 0;
    let cancelledAppointments = 0;

    snapshot.forEach((doc) => {
      const appointment = doc.data();

      if (appointment.status === "confirmed") {
        confirmedAppointments++;
      } else if (appointment.status === "pending") {
        pendingAppointments++;
      } else if (appointment.status === "completed") {
        completedAppointments++;
      } else if (appointment.status === "cancelled") {
        cancelledAppointments++;
      }
    });

    return {
      totalAppointments: snapshot.size,
      confirmedAppointments,
      pendingAppointments,
      completedAppointments,
      cancelledAppointments,
    };
  } catch (error) {
    console.error("Error getting appointments stats by period:", error);
    return {
      totalAppointments: 0,
      confirmedAppointments: 0,
      pendingAppointments: 0,
      completedAppointments: 0,
      cancelledAppointments: 0,
    };
  }
};

// Get visitors stats by time period from realtime database (optimized)
export const getVisitorsStatsByPeriod = async (startDate, endDate) => {
  try {
    const start = new Date(startDate);
    const end = new Date(endDate);

    const startDateStr = start.toISOString().split("T")[0];
    const endDateStr = end.toISOString().split("T")[0];

    // Use a single query to get all visitors data in the date range
    const visitorsRef = ref(database, "visitors");
    const rangeQuery = dbQuery(
      visitorsRef,
      orderByKey(),
      startAt(startDateStr),
      endAt(endDateStr)
    );

    const snapshot = await get(rangeQuery);

    if (!snapshot.exists()) {
      return {
        totalVisitors: 0,
        uniqueVisitors: 0,
        avgDailyVisitors: 0,
      };
    }

    const data = snapshot.val();
    const uniqueSessions = new Set();
    let totalVisitors = 0;

    // Process all visitors data at once
    Object.entries(data).forEach(([date, dayData]) => {
      if (dayData && typeof dayData === "object") {
        const sessionIds = Object.keys(dayData);
        totalVisitors += sessionIds.length;
        sessionIds.forEach((id) => uniqueSessions.add(id));
      }
    });

    const uniqueVisitors = uniqueSessions.size;

    // Calculate days in range
    const daysInRange = Math.ceil((end - start) / (1000 * 60 * 60 * 24)) + 1;
    const avgDailyVisitors =
      daysInRange > 0 ? Math.round(totalVisitors / daysInRange) : 0;

    return {
      totalVisitors,
      uniqueVisitors,
      avgDailyVisitors,
    };
  } catch (error) {
    console.error("Error getting visitors stats by period:", error);
    return {
      totalVisitors: 0,
      uniqueVisitors: 0,
      avgDailyVisitors: 0,
    };
  }
};
