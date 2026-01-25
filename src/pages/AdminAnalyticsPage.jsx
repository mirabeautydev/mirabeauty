import React, { useState, useEffect } from "react";
import "./AdminAnalyticsPage.css";
import {
  getTotalUsersCount,
  getOrdersStats,
  getAppointmentsStats,
  getPopularProducts,
  getPopularServices,
  getRevenueByDays,
  getVisitorsStats,
  getActiveUsersCount,
  getActiveAnonymousUsersCount,
  getTotalActiveUsersCount,
  getRecentActivities,
  getUsersStatsByPeriod,
  getOrdersStatsByPeriod,
  getAppointmentsStatsByPeriod,
  getVisitorsStatsByPeriod,
} from "../services/analyticsService";
import useModal from "../hooks/useModal";
import { safeResetForProduction } from "../utils/resetAnalytics";

const AdminAnalyticsPage = () => {
  const { showAlert } = useModal();
  const [loading, setLoading] = useState(true);
  const [timePeriod, setTimePeriod] = useState("all"); // all, today, week, month, custom
  const [customStartDate, setCustomStartDate] = useState("");
  const [customEndDate, setCustomEndDate] = useState("");
  const [stats, setStats] = useState({
    activeUsers: 0,
    activeAnonymousUsers: 0,
    totalActiveUsers: 0,
    totalUsers: 0,
    visitors: { today: 0, thisWeek: 0, thisMonth: 0 },
    orders: {
      totalOrders: 0,
      totalRevenue: 0,
      completedOrders: 0,
      pendingOrders: 0,
    },
    appointments: {
      totalAppointments: 0,
      confirmedAppointments: 0,
      pendingAppointments: 0,
    },
    popularProducts: [],
    popularServices: [],
    revenueChart: [],
    recentActivities: [],
  });
  const [periodStats, setPeriodStats] = useState({
    users: {
      totalUsers: 0,
      adminCount: 0,
      staffCount: 0,
      customerCount: 0,
    },
    visitors: {
      totalVisitors: 0,
      uniqueVisitors: 0,
      avgDailyVisitors: 0,
    },
  });
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    loadAnalytics();
  }, [refreshKey]);

  useEffect(() => {
    loadPeriodStats();

    // Auto-refresh period stats every 10 seconds
    const interval = setInterval(() => {
      loadPeriodStats();
    }, 10000);

    return () => clearInterval(interval);
  }, [timePeriod, customStartDate, customEndDate]);

  const getDateRange = () => {
    const now = new Date();
    let startDate, endDate;

    switch (timePeriod) {
      case "today":
        startDate = new Date(now.setHours(0, 0, 0, 0));
        endDate = new Date(now.setHours(23, 59, 59, 999));
        break;
      case "week":
        startDate = new Date(now);
        startDate.setDate(now.getDate() - 7);
        endDate = new Date();
        break;
      case "month":
        startDate = new Date(now);
        startDate.setMonth(now.getMonth() - 1);
        endDate = new Date();
        break;
      case "custom":
        if (customStartDate && customEndDate) {
          startDate = new Date(customStartDate);
          endDate = new Date(customEndDate);
          endDate.setHours(23, 59, 59, 999);
        }
        break;
      case "all":
      default:
        // Set to project start date (August 1, 2025) to exclude old test data
        startDate = new Date("2025-08-01");
        endDate = new Date();
    }

    return { startDate, endDate };
  };

  const loadPeriodStats = async () => {
    try {
      const { startDate, endDate } = getDateRange();

      if (timePeriod === "custom" && (!customStartDate || !customEndDate)) {
        return;
      }

      const [usersStats, visitorsStats] = await Promise.all([
        getUsersStatsByPeriod(startDate, endDate),
        getVisitorsStatsByPeriod(
          startDate || new Date(0),
          endDate || new Date(),
        ),
      ]);

      setPeriodStats({
        users: usersStats,
        visitors: visitorsStats,
      });
    } catch (error) {
      console.error("Error loading period stats:", error);
    }
  };

  const loadAnalytics = async () => {
    try {
      setLoading(true);

      // Fetch all stats in parallel
      const [
        totalUsers,
        ordersStats,
        appointmentsStats,
        popularProducts,
        popularServices,
        revenueChart,
        recentActivities,
      ] = await Promise.all([
        getTotalUsersCount(),
        getOrdersStats(),
        getAppointmentsStats(),
        getPopularProducts(5),
        getPopularServices(5),
        getRevenueByDays(7),
        getRecentActivities(10),
      ]);

      // Set up real-time listeners for active users and visitors
      const unsubscribeActiveUsers = getActiveUsersCount((count) => {
        setStats((prev) => ({ ...prev, activeUsers: count }));
      });

      const unsubscribeAnonymousUsers = getActiveAnonymousUsersCount(
        (count) => {
          setStats((prev) => ({ ...prev, activeAnonymousUsers: count }));
        },
      );

      const unsubscribeTotalActiveUsers = getTotalActiveUsersCount((count) => {
        setStats((prev) => ({ ...prev, totalActiveUsers: count }));
      });

      const unsubscribeVisitors = getVisitorsStats((visitorsData) => {
        setStats((prev) => ({ ...prev, visitors: visitorsData }));
      });

      setStats((prev) => ({
        ...prev,
        totalUsers,
        orders: ordersStats,
        appointments: appointmentsStats,
        popularProducts,
        popularServices,
        revenueChart,
        recentActivities,
      }));

      setLoading(false);

      // Cleanup listeners on unmount
      return () => {
        if (unsubscribeActiveUsers) unsubscribeActiveUsers();
        if (unsubscribeAnonymousUsers) unsubscribeAnonymousUsers();
        if (unsubscribeTotalActiveUsers) unsubscribeTotalActiveUsers();
        if (unsubscribeVisitors) unsubscribeVisitors();
      };
    } catch (error) {
      console.error("Error loading analytics:", error);
      showAlert("حدث خطأ أثناء تحميل البيانات", "error");
      setLoading(false);
    }
  };

  const handleRefresh = () => {
    setRefreshKey((prev) => prev + 1);
    loadPeriodStats();
  };

  const handleResetAnalytics = async () => {
    const confirmed = window.confirm(
      "⚠️ تحذير: سيتم مسح جميع بيانات الزوار والتواجد.\n\n" +
        "هذه العملية لا يمكن التراجع عنها!\n\n" +
        "ملاحظة: لن يتم مسح الطلبات والمواعيد والمستخدمين.\n\n" +
        "هل أنت متأكد من المتابعة؟",
    );

    if (!confirmed) return;

    try {
      setLoading(true);
      const result = await safeResetForProduction();

      if (result.success) {
        showAlert(result.message, "success");
        // Reload analytics after reset
        setRefreshKey((prev) => prev + 1);
      } else {
        showAlert(result.message, "error");
      }
    } catch (error) {
      console.error("Error resetting analytics:", error);
      showAlert("حدث خطأ أثناء إعادة تعيين البيانات", "error");
    } finally {
      setLoading(false);
    }
  };

  const getPeriodLabel = () => {
    switch (timePeriod) {
      case "today":
        return "اليوم";
      case "week":
        return "آخر 7 أيام";
      case "month":
        return "آخر 30 يوم";
      case "custom":
        return "فترة مخصصة";
      case "all":
      default:
        return "كل الوقت";
    }
  };

  const formatCurrency = (amount) => {
    return `${amount.toFixed(2)} ₪`;
  };

  const formatDate = (timestamp) => {
    if (!timestamp) return "غير محدد";
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleDateString("en-GB", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getActivityIcon = (type) => {
    switch (type) {
      case "order":
        return <i className="fas fa-shopping-bag"></i>;
      case "appointment":
        return <i className="fas fa-calendar-check"></i>;
      default:
        return <i className="fas fa-chart-bar"></i>;
    }
  };

  const getStatusColor = (status) => {
    const colors = {
      completed: "#10b981",
      delivered: "#10b981",
      confirmed: "#3b82f6",
      pending: "#f59e0b",
      processing: "#8b5cf6",
      cancelled: "#ef4444",
    };
    return colors[status] || "#6b7280";
  };

  if (loading) {
    return (
      <div className="admin-analytics-page">
        <div className="loading-container">
          <div className="spinner"></div>
          <p>جاري تحميل البيانات...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="admin-analytics-page">
      <div className="analytics-header">
        <div>
          <h1>
            <i className="fas fa-chart-line"></i> لوحة التحليلات
          </h1>
          <p>نظرة شاملة على أداء الموقع</p>
        </div>
        <div className="analytics-header-actions">
          <button className="refresh-btn" onClick={handleRefresh}>
            <i className="fas fa-sync-alt"></i>
            تحديث البيانات
          </button>
          <button className="reset-btn" onClick={handleResetAnalytics}>
            <i className="fas fa-trash-restore"></i>
            إعادة تعيين البيانات
          </button>
        </div>
      </div>

      {/* Time Period Selector */}
      <div className="analytics-time-period-selector">
        <div className="analytics-period-buttons">
          <button
            className={timePeriod === "all" ? "active" : ""}
            onClick={() => setTimePeriod("all")}
          >
            <i className="fas fa-infinity"></i> كل الوقت
          </button>
          <button
            className={timePeriod === "today" ? "active" : ""}
            onClick={() => setTimePeriod("today")}
          >
            <i className="fas fa-calendar-day"></i> اليوم
          </button>
          <button
            className={timePeriod === "week" ? "active" : ""}
            onClick={() => setTimePeriod("week")}
          >
            <i className="fas fa-calendar-week"></i> آخر 7 أيام
          </button>
          <button
            className={timePeriod === "month" ? "active" : ""}
            onClick={() => setTimePeriod("month")}
          >
            <i className="fas fa-calendar-alt"></i> آخر 30 يوم
          </button>
          <button
            className={timePeriod === "custom" ? "active" : ""}
            onClick={() => setTimePeriod("custom")}
          >
            <i className="fas fa-calendar"></i> فترة مخصصة
          </button>
        </div>

        {timePeriod === "custom" && (
          <div className="analytics-custom-date-range">
            <div className="analytics-date-input-group">
              <label>من تاريخ:</label>
              <input
                type="date"
                value={customStartDate}
                onChange={(e) => setCustomStartDate(e.target.value)}
                max={customEndDate || new Date().toISOString().split("T")[0]}
              />
            </div>
            <div className="analytics-date-input-group">
              <label>إلى تاريخ:</label>
              <input
                type="date"
                value={customEndDate}
                onChange={(e) => setCustomEndDate(e.target.value)}
                min={customStartDate}
                max={new Date().toISOString().split("T")[0]}
              />
            </div>
          </div>
        )}
      </div>

      {/* Period Stats Section */}
      <div className="analytics-period-stats-section">
        <h2 className="analytics-section-title">
          <i className="fas fa-chart-bar"></i> إحصائيات {getPeriodLabel()}
        </h2>

        <div className="analytics-period-stats-grid">
          {/* Users Period Stats */}
          <div className="analytics-period-stat-card">
            <div className="analytics-period-stat-icon">
              <i className="fas fa-user-plus"></i>
            </div>
            <div className="analytics-period-stat-content">
              <h3>مستخدمون جدد</h3>
              <p className="analytics-period-stat-number">
                {periodStats.users.totalUsers}
              </p>
              <span className="analytics-period-stat-label">
                عملاء: {periodStats.users.customerCount} | موظفون:{" "}
                {periodStats.users.staffCount} | إداريون:{" "}
                {periodStats.users.adminCount}
              </span>
            </div>
          </div>

          {/* Total Visitors */}
          <div className="analytics-period-stat-card">
            <div className="analytics-period-stat-icon">
              <i className="fas fa-eye"></i>
            </div>
            <div className="analytics-period-stat-content">
              <h3>إجمالي الزيارات</h3>
              <p className="analytics-period-stat-number">
                {periodStats.visitors.totalVisitors}
              </p>
              <span className="analytics-period-stat-label">
                جميع الزيارات (تشمل المتكررة)
              </span>
            </div>
          </div>

          {/* Unique Visitors */}
          <div className="analytics-period-stat-card">
            <div className="analytics-period-stat-icon">
              <i className="fas fa-user-check"></i>
            </div>
            <div className="analytics-period-stat-content">
              <h3>زوار فريدون</h3>
              <p className="analytics-period-stat-number">
                {periodStats.visitors.uniqueVisitors}
              </p>
              <span className="analytics-period-stat-label">
                عدد الأشخاص الفعليين
              </span>
            </div>
          </div>

          {/* Average Daily Visitors */}
          <div className="analytics-period-stat-card">
            <div className="analytics-period-stat-icon">
              <i className="fas fa-chart-line"></i>
            </div>
            <div className="analytics-period-stat-content">
              <h3>متوسط يومي</h3>
              <p className="analytics-period-stat-number">
                {periodStats.visitors.avgDailyVisitors}
              </p>
              <span className="analytics-period-stat-label">زائر في اليوم</span>
            </div>
          </div>
        </div>
      </div>

      {/* Real-time Stats Cards */}
      <div className="stats-grid">
        <div className="stat-card real-time">
          <div className="stat-icon">
            <i className="fas fa-circle" style={{ color: "#10b981" }}></i>
          </div>
          <div className="stat-content">
            <h3>الكل النشطون الآن</h3>
            <p className="stat-number">{stats.totalActiveUsers}</p>
            <span className="stat-label">متصل حالياً (مسجلين + زوار)</span>
          </div>
        </div>

        <div className="stat-card real-time">
          <div className="stat-icon">
            <i className="fas fa-user-check" style={{ color: "#10b981" }}></i>
          </div>
          <div className="stat-content">
            <h3>المستخدمون المسجلون النشطون</h3>
            <p className="stat-number">{stats.activeUsers}</p>
            <span className="stat-label">مستخدم مسجل نشط</span>
          </div>
        </div>

        <div className="stat-card real-time">
          <div className="stat-icon">
            <i className="fas fa-user" style={{ color: "#10b981" }}></i>
          </div>
          <div className="stat-content">
            <h3>الزوار النشطون</h3>
            <p className="stat-number">{stats.activeAnonymousUsers}</p>
            <span className="stat-label">زائر غير مسجل نشط</span>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon">
            <i className="fas fa-users" style={{ color: "white" }}></i>
          </div>
          <div className="stat-content">
            <h3>إجمالي المستخدمين</h3>
            <p className="stat-number">{stats.totalUsers}</p>
            <span className="stat-label">مستخدم مسجل</span>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon">
            <i className="fas fa-eye" style={{ color: "white" }}></i>
          </div>
          <div className="stat-content">
            <h3>الزوار اليوم</h3>
            <p className="stat-number">{stats.visitors.today}</p>
            <span className="stat-label">زائر جديد</span>
          </div>
        </div>

        {/* <div className="stat-card">
          <div className="stat-icon">
            <i className="fas fa-shekel-sign" style={{ color: "white" }}></i>
          </div>
          <div className="stat-content">
            <h3>إجمالي الإيرادات</h3>
            <p className="stat-number">
              {formatCurrency(stats.orders.totalRevenue)}
            </p>
            <span className="stat-label">{stats.orders.totalOrders} طلب</span>
          </div>
        </div> */}
      </div>

      {/* Orders & Appointments Stats */}
      <div className="stats-row">
        <div className="stats-card">
          <h2>
            <i className="fas fa-box" style={{ color: "var(--navy-blue)" }}></i>{" "}
            الطلبات
          </h2>
          <div className="stats-details">
            <div className="stat-item">
              <span className="stat-label">إجمالي الطلبات</span>
              <span className="stat-value">{stats.orders.totalOrders}</span>
            </div>
            <div className="stat-item">
              <span className="stat-label">طلبات مكتملة</span>
              <span className="stat-value" style={{ color: "#10b981" }}>
                {stats.orders.completedOrders}
              </span>
            </div>
            <div className="stat-item">
              <span className="stat-label">طلبات قيد المعالجة</span>
              <span className="stat-value" style={{ color: "#f59e0b" }}>
                {stats.orders.pendingOrders}
              </span>
            </div>
            <div className="stat-item">
              <span className="stat-label">الإيرادات</span>
              <span className="stat-value revenue">
                {formatCurrency(stats.orders.totalRevenue)}
              </span>
            </div>
          </div>
        </div>

        <div className="stats-card">
          <h2>
            <i
              className="fas fa-calendar-alt"
              style={{ color: "var(--navy-blue)" }}
            ></i>{" "}
            المواعيد
          </h2>
          <div className="stats-details">
            <div className="stat-item">
              <span className="stat-label">إجمالي المواعيد</span>
              <span className="stat-value">
                {stats.appointments.totalAppointments}
              </span>
            </div>
            <div className="stat-item">
              <span className="stat-label">مواعيد مؤكدة</span>
              <span className="stat-value" style={{ color: "#3b82f6" }}>
                {stats.appointments.confirmedAppointments}
              </span>
            </div>
            <div className="stat-item">
              <span className="stat-label">مواعيد قيد الانتظار</span>
              <span className="stat-value" style={{ color: "#f59e0b" }}>
                {stats.appointments.pendingAppointments}
              </span>
            </div>
            <div className="stat-item">
              <span className="stat-label">مواعيد منتهية</span>
              <span className="stat-value" style={{ color: "#10b981" }}>
                {stats.appointments.completedAppointments}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Activities */}
      <div className="activities-card">
        <h2>
          <i className="fas fa-clock" style={{ color: "var(--navy-blue)" }}></i>{" "}
          النشاطات الأخيرة
        </h2>
        {stats.recentActivities.length > 0 ? (
          <div className="activities-list">
            {stats.recentActivities.map((activity) => (
              <div key={activity.id} className="ana-activity-item">
                <div className="activity-icon">
                  {getActivityIcon(activity.type)}
                </div>
                <div className="activity-content">
                  <p className="activity-description">{activity.description}</p>
                  <span className="activity-time">
                    {formatDate(activity.timestamp)}
                  </span>
                </div>
                <span
                  className="ana-activity-status"
                  style={{ backgroundColor: getStatusColor(activity.status) }}
                >
                  {activity.status}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <p className="no-data">لا توجد نشاطات حديثة</p>
        )}
      </div>
    </div>
  );
};

export default AdminAnalyticsPage;
