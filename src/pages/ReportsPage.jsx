import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import "./ReportsPage.css";
import { getAllAppointments } from "../services/appointmentsService";
import { getAllConsultations } from "../services/consultationsService";
import { getCustomers, getStaff } from "../services/usersService";
import { getAllServices } from "../services/servicesService";
import { getAllProducts } from "../services/productsService";
import { getAllOrders } from "../services/ordersService";

const ReportsPage = ({ currentUser, userData }) => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [activeReport, setActiveReport] = useState("overview");
  const [dateRange, setDateRange] = useState("all");
  const [customStartDate, setCustomStartDate] = useState("");
  const [customEndDate, setCustomEndDate] = useState("");

  // Data states
  const [appointments, setAppointments] = useState([]);
  const [consultations, setConsultations] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [staff, setStaff] = useState([]);
  const [services, setServices] = useState([]);
  const [products, setProducts] = useState([]);
  const [orders, setOrders] = useState([]);

  // Load More states
  const [displayedProductsCount, setDisplayedProductsCount] = useState(10);
  const [displayedServicesCount, setDisplayedServicesCount] = useState(10);
  const ITEMS_PER_LOAD = 10;

  // Check if user is admin
  useEffect(() => {
    if (!currentUser || !userData || userData.role !== "admin") {
      navigate("/");
    }
  }, [currentUser, userData, navigate]);

  // Load all data
  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        const [
          appointmentsData,
          consultationsData,
          customersData,
          staffData,
          servicesData,
          productsData,
          ordersResponse,
        ] = await Promise.all([
          getAllAppointments(),
          getAllConsultations(),
          getCustomers(),
          getStaff(),
          getAllServices(),
          getAllProducts(),
          getAllOrders({}, 1000), // Get up to 1000 orders for reports
        ]);

        setAppointments(appointmentsData);
        setConsultations(consultationsData);
        setCustomers(customersData);
        setStaff(staffData);
        setServices(servicesData);
        setProducts(productsData);
        // Extract orders array from the response object
        setOrders(ordersResponse?.orders || []);
      } catch (error) {
        console.error("Error loading data:", error);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  // Helper function to parse prices
  const parsePrice = (priceString) => {
    if (!priceString) return 0;
    const priceStr = String(priceString);
    const numericValue = priceStr.replace(/[^\d.]/g, "");
    return parseFloat(numericValue) || 0;
  };

  // Helper function to get date range text
  const getDateRangeText = () => {
    const now = new Date();
    const formatDate = (date) => {
      return date.toLocaleDateString("en-GB", {
        year: "numeric",
        month: "numeric",
        day: "numeric",
      });
    };

    switch (dateRange) {
      case "all":
        return "جميع الفترات";
      case "today":
        return `اليوم - ${formatDate(now)}`;
      case "week":
        const weekStart = new Date(now);
        weekStart.setDate(now.getDate() - 7);
        return `آخر 7 أيام (من ${formatDate(weekStart)} إلى ${formatDate(
          now,
        )})`;
      case "month":
        const monthStart = new Date(now);
        monthStart.setMonth(now.getMonth() - 1);
        return `آخر شهر (من ${formatDate(monthStart)} إلى ${formatDate(now)})`;
      case "year":
        const yearStart = new Date(now);
        yearStart.setFullYear(now.getFullYear() - 1);
        return `آخر سنة (من ${formatDate(yearStart)} إلى ${formatDate(now)})`;
      case "custom":
        if (customStartDate && customEndDate) {
          return `من ${formatDate(new Date(customStartDate))} إلى ${formatDate(
            new Date(customEndDate),
          )}`;
        }
        return "فترة مخصصة";
      default:
        return "غير محدد";
    }
  };

  // Filter data by date range
  const filterByDateRange = (data, dateField = "createdAt") => {
    // Ensure data is an array
    if (!Array.isArray(data)) return [];
    if (dateRange === "all") return data;

    const now = new Date();
    let startDate = new Date();

    switch (dateRange) {
      case "today":
        startDate.setHours(0, 0, 0, 0);
        break;
      case "week":
        startDate.setDate(now.getDate() - 7);
        break;
      case "month":
        startDate.setMonth(now.getMonth() - 1);
        break;
      case "year":
        startDate.setFullYear(now.getFullYear() - 1);
        break;
      case "custom":
        if (customStartDate && customEndDate) {
          startDate = new Date(customStartDate);
          startDate.setHours(0, 0, 0, 0); // Start of day
          const endDate = new Date(customEndDate);
          endDate.setHours(23, 59, 59, 999); // End of day
          return data.filter((item) => {
            if (!item[dateField]) return true; // Include items without date
            const itemDate = item[dateField]?.seconds
              ? new Date(item[dateField].seconds * 1000)
              : new Date(item[dateField]);
            return itemDate >= startDate && itemDate <= endDate;
          });
        }
        return data;
      default:
        return data;
    }

    return data.filter((item) => {
      if (!item[dateField]) return true; // Include items without date
      const itemDate = item[dateField]?.seconds
        ? new Date(item[dateField].seconds * 1000)
        : new Date(item[dateField]);
      return itemDate >= startDate;
    });
  };

  // Calculate statistics
  const filteredAppointments = filterByDateRange(appointments);
  const filteredOrders = filterByDateRange(orders);
  const filteredConsultations = filterByDateRange(consultations);

  const totalAppointments = filteredAppointments.length;
  const completedAppointments = filteredAppointments.filter(
    (apt) => apt.status === "مكتمل",
  ).length;
  const cancelledAppointments = filteredAppointments.filter(
    (apt) => apt.status === "ملغي",
  ).length;
  const pendingAppointments = filteredAppointments.filter(
    (apt) => apt.status === "في الانتظار",
  ).length;
  const confirmedAppointments = filteredAppointments.filter(
    (apt) => apt.status === "مؤكد",
  ).length;

  const appointmentRevenue = filteredAppointments
    .filter((apt) => apt.status === "مكتمل")
    .reduce((sum, apt) => {
      const price = parsePrice(
        apt.actualPaidAmount || apt.servicePrice || apt.price,
      );
      return sum + price;
    }, 0);

  // Count only confirmed orders
  const confirmedOrdersList = filteredOrders.filter(
    (order) => order.status === "confirmed",
  );
  const totalOrders = confirmedOrdersList.length;
  const confirmedOrders = confirmedOrdersList.length;
  const pendingOrders = filteredOrders.filter(
    (order) => order.status === "pending",
  ).length;
  const cancelledOrders = filteredOrders.filter(
    (order) => order.status === "cancelled",
  ).length;

  // Calculate revenue only from confirmed orders
  const ordersRevenue = confirmedOrdersList.reduce(
    (sum, order) => sum + parsePrice(order.total),
    0,
  );

  const totalRevenue = appointmentRevenue + ordersRevenue;
  const totalConsultations = filteredConsultations.length;

  // Service statistics - count all appointments and track completed ones
  const serviceStats = services
    .map((service) => {
      // Count ALL appointments for this service
      const allServiceAppts = filteredAppointments.filter(
        (apt) => apt.serviceId === service.id,
      );
      // Count only completed appointments
      const completedAppts = filteredAppointments.filter(
        (apt) => apt.serviceId === service.id && apt.status === "مكتمل",
      );
      const revenue = completedAppts.reduce((sum, apt) => {
        const price = parsePrice(
          apt.actualPaidAmount || apt.servicePrice || apt.price,
        );
        return sum + price;
      }, 0);
      return {
        ...service,
        appointmentCount: allServiceAppts.length, // Total appointments
        completedCount: completedAppts.length, // Only completed
        revenue: revenue,
      };
    })
    .sort((a, b) => b.appointmentCount - a.appointmentCount);

  // Product statistics - count only confirmed orders
  const productStats = products
    .map((product) => {
      const confirmedProductOrders = confirmedOrdersList.filter((order) =>
        order.items?.some((item) => item.id === product.id),
      );
      const totalSold = confirmedProductOrders.reduce((sum, order) => {
        const item = order.items.find((i) => i.id === product.id);
        return sum + (item?.quantity || 0);
      }, 0);
      const revenue = confirmedProductOrders.reduce((sum, order) => {
        const item = order.items.find((i) => i.id === product.id);
        return sum + parsePrice(item?.price || 0) * (item?.quantity || 0);
      }, 0);
      return {
        ...product,
        totalSold: totalSold,
        revenue: revenue,
      };
    })
    .sort((a, b) => b.revenue - a.revenue);

  // Staff statistics
  const staffStats = staff
    .map((staffMember) => {
      const staffAppointments = filteredAppointments.filter(
        (apt) => apt.staffId === staffMember.id,
      );
      const completedAppts = staffAppointments.filter(
        (apt) => apt.status === "مكتمل",
      );
      const revenue = completedAppts.reduce((sum, apt) => {
        const price = parsePrice(
          apt.actualPaidAmount || apt.servicePrice || apt.price,
        );
        return sum + price;
      }, 0);
      return {
        ...staffMember,
        appointmentCount: staffAppointments.length,
        completedCount: completedAppts.length,
        revenue: revenue,
      };
    })
    .sort((a, b) => b.revenue - a.revenue);

  // Customer statistics (exclude admin and staff)
  const customerStats = customers
    .filter((customer) => customer.role === "customer")
    .map((customer) => {
      // Match appointments by customerId, email, or phone to handle potential ID mismatches
      const customerAppointments = filteredAppointments.filter(
        (apt) =>
          apt.customerId === customer.id ||
          (apt.customerEmail &&
            apt.customerEmail.toLowerCase() ===
              customer.email?.toLowerCase()) ||
          (apt.customerPhone &&
            apt.customerPhone
              .replace(/[\s\-\+]/g, "")
              .includes(customer.phone?.replace(/[\s\-\+]/g, ""))) ||
          (customer.phone &&
            apt.customerPhone &&
            customer.phone
              .replace(/[\s\-\+]/g, "")
              .includes(apt.customerPhone.replace(/[\s\-\+]/g, ""))),
      );

      const customerOrders = filteredOrders.filter(
        (order) =>
          order.userId === customer.id ||
          (order.userEmail &&
            order.userEmail.toLowerCase() === customer.email?.toLowerCase()),
      );
      const totalSpent =
        customerAppointments
          .filter((apt) => apt.status === "مكتمل")
          .reduce((sum, apt) => {
            const price = parsePrice(
              apt.actualPaidAmount || apt.servicePrice || apt.price,
            );
            return sum + price;
          }, 0) +
        customerOrders
          .filter((order) => order.status === "confirmed")
          .reduce((sum, order) => sum + parsePrice(order.total), 0);

      return {
        ...customer,
        appointmentCount: customerAppointments.length,
        orderCount: customerOrders.length,
        totalSpent: totalSpent,
      };
    })
    .sort((a, b) => b.totalSpent - a.totalSpent);

  // Monthly revenue data (last 12 months)
  const getMonthlyRevenue = () => {
    const months = [];
    const now = new Date();

    for (let i = 11; i >= 0; i--) {
      const monthDate = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthName = monthDate.toLocaleDateString("en-GB", {
        month: "short",
        year: "numeric",
      });

      const monthStart = new Date(
        monthDate.getFullYear(),
        monthDate.getMonth(),
        1,
      );
      const monthEnd = new Date(
        monthDate.getFullYear(),
        monthDate.getMonth() + 1,
        0,
      );

      const monthAppointments = appointments.filter((apt) => {
        if (apt.status !== "مكتمل") return false;
        const aptDate = apt.createdAt?.seconds
          ? new Date(apt.createdAt.seconds * 1000)
          : new Date(apt.createdAt);
        return aptDate >= monthStart && aptDate <= monthEnd;
      });

      const monthOrders = orders.filter((order) => {
        if (order.status !== "confirmed") return false;
        const orderDate = order.createdAt?.seconds
          ? new Date(order.createdAt.seconds * 1000)
          : new Date(order.createdAt);
        return orderDate >= monthStart && orderDate <= monthEnd;
      });

      const revenue =
        monthAppointments.reduce(
          (sum, apt) =>
            sum +
            parsePrice(apt.actualPaidAmount || apt.servicePrice || apt.price),
          0,
        ) +
        monthOrders.reduce((sum, order) => sum + parsePrice(order.total), 0);

      months.push({
        month: monthName,
        revenue: revenue,
        appointmentCount: monthAppointments.length,
        orderCount: monthOrders.length,
      });
    }

    return months;
  };

  const monthlyRevenue = getMonthlyRevenue();

  const handlePrint = () => {
    const printDate = new Date()
      .toLocaleDateString("en-GB", {
        year: "numeric",
        month: "numeric",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        hour12: true,
      })
      .replace("am", "AM")
      .replace("pm", "PM");

    // Helper function to format currency
    const formatCurrency = (amount) => `${parseFloat(amount).toFixed(2)} ₪`;

    // Create print document
    const printWindow = window.open("", "_blank");
    printWindow.document.write(`
      <!DOCTYPE html>
      <html dir="rtl" lang="ar">
      <head>
        <meta charset="UTF-8">
        <style>
          * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
          }
          body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            padding: 20px;
            background: white;
            color: #000;
            direction: rtl;
          }
          .report-header {
            text-align: center;
            margin-bottom: 30px;
            padding-bottom: 20px;
            border-bottom: 3px solid #071626;
          }
          .report-header h1 {
            color: #071626;
            font-size: 28px;
            margin-bottom: 10px;
          }
          .report-header p {
            color: #666;
            font-size: 14px;
            margin: 5px 0;
          }
          .section {
            margin-bottom: 40px;
            page-break-inside: avoid;
          }
          .section-title {
            background: #071626;
            color: white;
            padding: 12px 20px;
            font-size: 18px;
            font-weight: bold;
            margin-bottom: 20px;
          }
          .stats-grid {
            display: grid;
            grid-template-columns: repeat(3, 1fr);
            gap: 15px;
            margin-bottom: 20px;
          }
          .stat-box {
            border: 2px solid #ddd;
            padding: 15px;
            text-align: center;
          }
          .stat-box h3 {
            color: #071626;
            font-size: 14px;
            margin-bottom: 8px;
          }
          .stat-box .value {
            font-size: 24px;
            font-weight: bold;
            color: #000;
          }
          .stat-box .sub-value {
            font-size: 12px;
            color: #666;
            margin-top: 5px;
          }
          table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 20px;
          }
          table thead {
            background: #071626;
          }
          table th {
            color: white;
            padding: 12px 8px;
            text-align: center;
            font-weight: bold;
            border: 1px solid #333;
            font-size: 14px;
          }
          table td {
            padding: 10px 8px;
            text-align: center;
            border: 1px solid #ddd;
            font-size: 13px;
          }
          table tbody tr:nth-child(even) {
            background: #f5f5f5;
          }
          .page-break {
            page-break-after: always;
          }
          @media print {
            body { padding: 10px; }
            .page-break { page-break-after: always; }
          }
        </style>
      </head>
      <body>
        <div class="report-header">
          <h1>مركز ميرا بيوتي - Mira Beauty Clinic</h1>
          <p>تقرير شامل للأعمال والإحصائيات</p>
          <p>فترة التقرير: ${getDateRangeText()}</p>
          <p>تاريخ الطباعة: ${printDate}</p>
        </div>

        <!-- Overview Section -->
        <div class="section">
          <div class="section-title">نظرة عامة - Overview</div>
          <div class="stats-grid">
            <div class="stat-box">
              <h3>إجمالي الإيرادات</h3>
              <div class="value">${formatCurrency(totalRevenue)}</div>
              <div class="sub-value">مواعيد: ${formatCurrency(
                appointmentRevenue,
              )} | طلبات: ${formatCurrency(ordersRevenue)}</div>
            </div>
            <div class="stat-box">
              <h3>المواعيد</h3>
              <div class="value">${totalAppointments}</div>
              <div class="sub-value">مكتمل: ${completedAppointments} | ملغي: ${cancelledAppointments}</div>
            </div>
            <div class="stat-box">
              <h3>الطلبات المسلمة</h3>
              <div class="value">${totalOrders}</div>
              <div class="sub-value">من أصل ${filteredOrders.length} طلب</div>
            </div>
          </div>
        </div>
        <div class="page-break"></div>

        <!-- Revenue Section -->
        <div class="section">
          <div class="section-title">تقرير الإيرادات - Revenue Report</div>
          <div class="stats-grid">
            <div class="stat-box">
              <h3>إجمالي الإيرادات</h3>
              <div class="value">${formatCurrency(totalRevenue)}</div>
            </div>
            <div class="stat-box">
              <h3>إيرادات المواعيد</h3>
              <div class="value">${formatCurrency(appointmentRevenue)}</div>
            </div>
            <div class="stat-box">
              <h3>إيرادات الطلبات</h3>
              <div class="value">${formatCurrency(ordersRevenue)}</div>
            </div>
          </div>
        </div>
        <div class="page-break"></div>

        <!-- Services Section -->
        <div class="section">
          <div class="section-title">تقرير الخدمات - Services Report</div>
          <table>
            <thead>
              <tr>
                <th>#</th>
                <th>اسم الخدمة</th>
                <th>عدد الحجوزات</th>
                <th>الحجوزات المكتملة</th>
                <th>نسبة الإنجاز</th>
                <th>الإيرادات</th>
              </tr>
            </thead>
            <tbody>
              ${serviceStats
                .map(
                  (service, index) => `
                <tr>
                  <td>${index + 1}</td>
                  <td>${service.name}</td>
                  <td>${service.appointmentCount}</td>
                  <td>${service.completedCount}</td>
                  <td>${
                    service.appointmentCount > 0
                      ? (
                          (service.completedCount / service.appointmentCount) *
                          100
                        ).toFixed(1)
                      : 0
                  }%</td>
                  <td>${formatCurrency(service.revenue)}</td>
                </tr>
              `,
                )
                .join("")}
            </tbody>
          </table>
        </div>
        <div class="page-break"></div>

        <!-- Products Section -->
        <div class="section">
          <div class="section-title">تقرير المنتجات - Products Report</div>
          <table>
            <thead>
              <tr>
                <th>#</th>
                <th>اسم المنتج</th>
                <th>الكمية المباعة</th>
                <th>الإيرادات</th>
                <th>السعر</th>
                <th>المخزون</th>
              </tr>
            </thead>
            <tbody>
              ${productStats
                .map(
                  (product, index) => `
                <tr>
                  <td>${index + 1}</td>
                  <td>${product.name}</td>
                  <td>${product.totalSold || 0}</td>
                  <td>${formatCurrency(product.revenue || 0)}</td>
                  <td>${product.price} شيكل</td>
                  <td>${product.stock || 0}</td>
                </tr>
              `,
                )
                .join("")}
            </tbody>
          </table>
        </div>
        <div class="page-break"></div>

        <!-- Staff Section -->
        <div class="section">
          <div class="section-title">تقرير أداء الموظفين - Staff Performance Report</div>
          <table>
            <thead>
              <tr>
                <th>#</th>
                <th>اسم الموظف</th>
                <th>عدد المواعيد</th>
                <th>المواعيد المكتملة</th>
                <th>نسبة الإنجاز</th>
                <th>الإيرادات المحققة</th>
              </tr>
            </thead>
            <tbody>
              ${staffStats
                .map(
                  (member, index) => `
                <tr>
                  <td>${index + 1}</td>
                  <td>${member.name}</td>
                  <td>${member.appointmentCount}</td>
                  <td>${member.completedCount}</td>
                  <td>${
                    member.appointmentCount > 0
                      ? (
                          (member.completedCount / member.appointmentCount) *
                          100
                        ).toFixed(1)
                      : 0
                  }%</td>
                  <td>${formatCurrency(member.revenue)}</td>
                </tr>
              `,
                )
                .join("")}
            </tbody>
          </table>
        </div>
        <div class="page-break"></div>

        <!-- Customers Section -->
        <div class="section">
          <div class="section-title">تقرير العملاء - Customers Report</div>
          <div class="stats-grid">
            <div class="stat-box">
              <h3>إجمالي العملاء</h3>
              <div class="value">${customers.length}</div>
            </div>
            <div class="stat-box">
              <h3>عملاء نشطين</h3>
              <div class="value">${
                customerStats.filter(
                  (c) => c.appointmentCount > 0 || c.orderCount > 0,
                ).length
              }</div>
            </div>
            <div class="stat-box">
              <h3>إجمالي الإنفاق</h3>
              <div class="value">${formatCurrency(
                customerStats.reduce((sum, c) => sum + c.totalSpent, 0),
              )}</div>
            </div>
          </div>
          <p style="margin-bottom: 15px; color: #666; font-size: 14px;">أفضل 10 عملاء حسب الإنفاق - Top 10 Customers by Spending</p>
          <table>
            <thead>
              <tr>
                <th>#</th>
                <th>اسم العميل</th>
                <th>البريد الإلكتروني</th>
                <th>عدد المواعيد</th>
                <th>عدد الطلبات</th>
                <th>إجمالي الإنفاق</th>
              </tr>
            </thead>
            <tbody>
              ${customerStats
                .slice(0, 10)
                .map(
                  (customer, index) => `
                <tr>
                  <td>${index + 1}</td>
                  <td>${customer.name}</td>
                  <td>${customer.email}</td>
                  <td>${customer.appointmentCount}</td>
                  <td>${customer.orderCount}</td>
                  <td>${formatCurrency(customer.totalSpent)}</td>
                </tr>
              `,
                )
                .join("")}
            </tbody>
          </table>
        </div>

        <script>
          window.onload = function() {
            window.print();
            setTimeout(function() {
              window.close();
            }, 100);
          };
        </script>
      </body>
      </html>
    `);
    printWindow.document.close();
  };

  if (loading) {
    return (
      <div className="reports-page">
        <div className="loading-state">
          <div className="loading-spinner"></div>
          <p>جاري تحميل التقارير...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="reports-page">
      {/* Date Range Filter */}
      <section className="date-filter-section">
        <div className="container">
          <div className="date-filter-card">
            <h3>
              <i className="fas fa-calendar-alt"></i>
              فترة التقرير
            </h3>
            <div className="filter-options">
              <button
                className={`filter-btn ${dateRange === "all" ? "active" : ""}`}
                onClick={() => setDateRange("all")}
              >
                الكل
              </button>
              <button
                className={`filter-btn ${
                  dateRange === "today" ? "active" : ""
                }`}
                onClick={() => setDateRange("today")}
              >
                اليوم
              </button>
              <button
                className={`filter-btn ${dateRange === "week" ? "active" : ""}`}
                onClick={() => setDateRange("week")}
              >
                آخر 7 أيام
              </button>
              <button
                className={`filter-btn ${
                  dateRange === "month" ? "active" : ""
                }`}
                onClick={() => setDateRange("month")}
              >
                آخر شهر
              </button>
              <button
                className={`filter-btn ${dateRange === "year" ? "active" : ""}`}
                onClick={() => setDateRange("year")}
              >
                آخر سنة
              </button>
              <button
                className={`filter-btn ${
                  dateRange === "custom" ? "active" : ""
                }`}
                onClick={() => setDateRange("custom")}
              >
                فترة مخصصة
              </button>
            </div>

            {dateRange === "custom" && (
              <div className="custom-date-inputs">
                <div className="date-input-group">
                  <label>من تاريخ:</label>
                  <input
                    type="date"
                    value={customStartDate}
                    onChange={(e) => setCustomStartDate(e.target.value)}
                  />
                </div>
                <div className="date-input-group">
                  <label>إلى تاريخ:</label>
                  <input
                    type="date"
                    value={customEndDate}
                    onChange={(e) => setCustomEndDate(e.target.value)}
                  />
                </div>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Report Navigation */}
      <section className="report-navigation">
        <div className="container">
          <div className="report-tabs">
            <button
              className={`report-tab ${
                activeReport === "overview" ? "active" : ""
              }`}
              onClick={() => setActiveReport("overview")}
            >
              <i className="fas fa-chart-line"></i>
              نظرة عامة
            </button>
            <button
              className={`report-tab ${
                activeReport === "revenue" ? "active" : ""
              }`}
              onClick={() => setActiveReport("revenue")}
            >
              <i className="fas fa-dollar-sign"></i>
              الإيرادات
            </button>
            <button
              className={`report-tab ${
                activeReport === "services" ? "active" : ""
              }`}
              onClick={() => setActiveReport("services")}
            >
              <i className="fas fa-spa"></i>
              الخدمات
            </button>
            <button
              className={`report-tab ${
                activeReport === "products" ? "active" : ""
              }`}
              onClick={() => setActiveReport("products")}
            >
              <i className="fas fa-box"></i>
              المنتجات
            </button>
            <button
              className={`report-tab ${
                activeReport === "staff" ? "active" : ""
              }`}
              onClick={() => setActiveReport("staff")}
            >
              <i className="fas fa-users"></i>
              الموظفين
            </button>
            {/* <button
              className={`report-tab ${
                activeReport === "customers" ? "active" : ""
              }`}
              onClick={() => setActiveReport("customers")}
            >
              <i className="fas fa-user-friends"></i>
              العملاء
            </button> */}
          </div>
        </div>
      </section>

      {/* Overview Report */}
      {activeReport === "overview" && (
        <section className="report-content">
          <div className="container">
            <div className="report-header-with-actions">
              <h2>نظرة عامة</h2>
              <button className="btn-primary print-btn" onClick={handlePrint}>
                <i className="fas fa-print"></i>
                طباعة التقرير
              </button>
            </div>

            {/* Summary Cards */}
            <div className="summary-grid">
              <div className="summary-card revenue">
                <div className="card-icon">
                  <i
                    className="fas fa-dollar-sign"
                    style={{ color: "white" }}
                  ></i>
                </div>
                <div className="card-info">
                  <h3>إجمالي الإيرادات</h3>
                  <p className="amount">{totalRevenue.toFixed(2)} شيكل</p>
                  <span className="sub-text">
                    مواعيد: {appointmentRevenue.toFixed(2)} | طلبات:{" "}
                    {ordersRevenue.toFixed(2)}
                  </span>
                </div>
              </div>

              <div className="summary-card appointments">
                <div className="card-icon">
                  <i
                    className="fas fa-calendar-check"
                    style={{ color: "white" }}
                  ></i>
                </div>
                <div className="card-info">
                  <h3>المواعيد</h3>
                  <p className="amount">{totalAppointments}</p>
                  <span className="sub-text">
                    مكتمل: {completedAppointments} | ملغي:{" "}
                    {cancelledAppointments}
                  </span>
                </div>
              </div>

              <div className="summary-card orders">
                <div className="card-icon">
                  <i
                    className="fas fa-shopping-cart"
                    style={{ color: "white" }}
                  ></i>
                </div>
                <div className="card-info">
                  <h3>الطلبات</h3>
                  <p className="amount">{totalOrders}</p>
                  <span className="sub-text">
                    مؤكد: {confirmedOrders} | قيد الانتظار: {pendingOrders}
                  </span>
                </div>
              </div>

              {/* <div className="summary-card consultations">
                <div className="card-icon">
                  <i className="fas fa-comments" style={{ color: "white" }}></i>
                </div>
                <div className="card-info">
                  <h3>الاستشارات</h3>
                  <p className="amount">{totalConsultations}</p>
                  <span className="sub-text">استشارات مجانية</span>
                </div>
              </div> */}
            </div>

            {/* Charts */}
            <div className="charts-grid">
              <div className="chart-card">
                <h3>حالة المواعيد</h3>
                <div className="status-chart">
                  <div className="status-item">
                    <div className="status-bar-wrapper">
                      <div className="status-label">
                        <span>مكتمل</span>
                        <span className="status-value">
                          {completedAppointments}
                        </span>
                      </div>
                      <div className="status-bar">
                        <div
                          className="status-fill completed"
                          style={{
                            width: `${
                              (completedAppointments / totalAppointments) * 100
                            }%`,
                          }}
                        ></div>
                      </div>
                    </div>
                  </div>
                  <div className="status-item">
                    <div className="status-bar-wrapper">
                      <div className="status-label">
                        <span>مؤكد</span>
                        <span className="status-value">
                          {confirmedAppointments}
                        </span>
                      </div>
                      <div className="status-bar">
                        <div
                          className="status-fill confirmed"
                          style={{
                            width: `${
                              (confirmedAppointments / totalAppointments) * 100
                            }%`,
                          }}
                        ></div>
                      </div>
                    </div>
                  </div>
                  <div className="status-item">
                    <div className="status-bar-wrapper">
                      <div className="status-label">
                        <span>قيد الانتظار</span>
                        <span className="status-value">
                          {pendingAppointments}
                        </span>
                      </div>
                      <div className="status-bar">
                        <div
                          className="status-fill pending"
                          style={{
                            width: `${
                              (pendingAppointments / totalAppointments) * 100
                            }%`,
                          }}
                        ></div>
                      </div>
                    </div>
                  </div>
                  <div className="status-item">
                    <div className="status-bar-wrapper">
                      <div className="status-label">
                        <span>ملغي</span>
                        <span className="status-value">
                          {cancelledAppointments}
                        </span>
                      </div>
                      <div className="status-bar">
                        <div
                          className="status-fill cancelled"
                          style={{
                            width: `${
                              (cancelledAppointments / totalAppointments) * 100
                            }%`,
                          }}
                        ></div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="chart-card">
                <h3>أهم الخدمات (حسب الحجوزات)</h3>
                <div className="top-items-list">
                  {serviceStats.slice(0, 5).map((service, index) => (
                    <div key={service.id} className="top-item">
                      <span className="item-rank">#{index + 1}</span>
                      <span className="item-name">{service.name}</span>
                      <span className="item-value">
                        {service.appointmentCount} حجز
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Revenue Report */}
      {activeReport === "revenue" && (
        <section className="report-content">
          <div className="container">
            <div className="report-header-with-actions">
              <h2>تقرير الإيرادات</h2>
              <button className="btn-primary print-btn" onClick={handlePrint}>
                <i className="fas fa-print"></i>
                طباعة التقرير
              </button>
            </div>

            <div className="revenue-summary">
              <div className="revenue-card total">
                <h3>إجمالي الإيرادات</h3>
                <p className="revenue-amount">{totalRevenue.toFixed(2)} شيكل</p>
              </div>
              <div className="revenue-card appointments">
                <h3>إيرادات المواعيد</h3>
                <p className="revenue-amount">
                  {appointmentRevenue.toFixed(2)} شيكل
                </p>
                <span className="percentage">
                  {((appointmentRevenue / totalRevenue) * 100).toFixed(1)}%
                </span>
              </div>
              <div className="revenue-card orders">
                <h3>إيرادات الطلبات</h3>
                <p className="revenue-amount">
                  {ordersRevenue.toFixed(2)} شيكل
                </p>
                <span className="percentage">
                  {((ordersRevenue / totalRevenue) * 100).toFixed(1)}%
                </span>
              </div>
            </div>

            {/* Monthly Revenue Chart */}
            <div className="chart-card full-width">
              <h3>الإيرادات الشهرية (آخر 12 شهر)</h3>
              <div className="monthly-revenue-chart">
                {monthlyRevenue.map((month, index) => {
                  const maxRevenue = Math.max(
                    ...monthlyRevenue.map((m) => m.revenue),
                  );
                  const height =
                    maxRevenue > 0 ? (month.revenue / maxRevenue) * 100 : 0;

                  return (
                    <div key={index} className="month-bar">
                      <div className="bar-wrapper">
                        <div
                          className="bar-fill"
                          style={{ height: `${height}%` }}
                          title={`${month.revenue.toFixed(2)} شيكل`}
                        >
                          <span className="bar-value">
                            {month.revenue.toFixed(0)}
                          </span>
                        </div>
                      </div>
                      <div className="month-label">{month.month}</div>
                      <div className="month-details">
                        <small>
                          {month.appointmentCount + month.orderCount} عملية
                        </small>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Services Report */}
      {activeReport === "services" && (
        <section className="report-content">
          <div className="container">
            <div className="report-header-with-actions">
              <h2>تقرير الخدمات</h2>
              <button className="btn-primary print-btn" onClick={handlePrint}>
                <i className="fas fa-print"></i>
                طباعة التقرير
              </button>
            </div>

            <div className="report-table-card">
              <table className="report-table">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>اسم الخدمة</th>
                    <th>عدد الحجوزات</th>
                    <th>الحجوزات المكتملة</th>
                    <th>الإيرادات</th>
                    <th>متوسط السعر</th>
                  </tr>
                </thead>
                <tbody>
                  {serviceStats
                    .slice(0, displayedServicesCount)
                    .map((service, index) => (
                      <tr key={service.id}>
                        <td>{index + 1}</td>
                        <td>{service.name}</td>
                        <td>{service.appointmentCount}</td>
                        <td>{service.completedCount}</td>
                        <td className="revenue-cell">
                          {service.revenue.toFixed(2)} شيكل
                        </td>
                        <td>
                          {service.completedCount > 0
                            ? (
                                service.revenue / service.completedCount
                              ).toFixed(2)
                            : 0}{" "}
                          شيكل
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>

              {/* Load More Button for Services */}
              {displayedServicesCount < serviceStats.length && (
                <div
                  style={{
                    display: "flex",
                    justifyContent: "center",
                    padding: "1.5rem",
                    borderTop: "1px solid #eee",
                  }}
                >
                  <button
                    className="btn-secondary"
                    onClick={() =>
                      setDisplayedServicesCount((prev) => prev + ITEMS_PER_LOAD)
                    }
                    style={{
                      padding: "0.6rem 1.5rem",
                      fontSize: "0.95rem",
                      borderRadius: "6px",
                    }}
                  >
                    <i
                      className="fas fa-plus-circle"
                      style={{ marginLeft: "8px" }}
                    ></i>
                    تحميل المزيد ({serviceStats.length - displayedServicesCount}{" "}
                    متبقي)
                  </button>
                </div>
              )}

              {displayedServicesCount >= serviceStats.length &&
                serviceStats.length > 10 && (
                  <div
                    style={{
                      textAlign: "center",
                      padding: "1rem",
                      color: "#666",
                      fontSize: "0.9rem",
                      borderTop: "1px solid #eee",
                    }}
                  >
                    <i
                      className="fas fa-check-circle"
                      style={{
                        marginLeft: "8px",
                        color: "var(--primary-color)",
                      }}
                    ></i>
                    تم عرض جميع الخدمات ({serviceStats.length})
                  </div>
                )}
            </div>
          </div>
        </section>
      )}

      {/* Products Report */}
      {activeReport === "products" && (
        <section className="report-content">
          <div className="container">
            <div className="report-header-with-actions">
              <h2>تقرير المنتجات</h2>
              <button className="btn-primary print-btn" onClick={handlePrint}>
                <i className="fas fa-print"></i>
                طباعة التقرير
              </button>
            </div>

            <div className="report-table-card">
              <table className="report-table">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>اسم المنتج</th>
                    <th>الكمية المباعة</th>
                    <th>الإيرادات</th>
                    <th>السعر</th>
                    <th>المخزون</th>
                  </tr>
                </thead>
                <tbody>
                  {productStats
                    .slice(0, displayedProductsCount)
                    .map((product, index) => (
                      <tr key={product.id}>
                        <td>{index + 1}</td>
                        <td>{product.name}</td>
                        <td>{product.totalSold}</td>
                        <td className="revenue-cell">
                          {product.revenue.toFixed(2)} شيكل
                        </td>
                        <td>{product.price} شيكل</td>
                        <td>
                          <span
                            className={`stock-status ${
                              (product.quantity !== undefined
                                ? product.quantity
                                : product.inStock
                                  ? 999
                                  : 0) > 0
                                ? "in-stock"
                                : "out-stock"
                            }`}
                          >
                            {(product.quantity !== undefined
                              ? product.quantity
                              : product.inStock
                                ? 999
                                : 0) > 0
                              ? `متوفر (${
                                  product.quantity !== undefined
                                    ? product.quantity
                                    : "غير محدد"
                                })`
                              : "نفذ"}
                          </span>
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>

              {/* Load More Button for Products */}
              {displayedProductsCount < productStats.length && (
                <div
                  style={{
                    display: "flex",
                    justifyContent: "center",
                    padding: "1.5rem",
                    borderTop: "1px solid #eee",
                  }}
                >
                  <button
                    className="btn-secondary"
                    onClick={() =>
                      setDisplayedProductsCount((prev) => prev + ITEMS_PER_LOAD)
                    }
                    style={{
                      padding: "0.6rem 1.5rem",
                      fontSize: "0.95rem",
                      borderRadius: "6px",
                    }}
                  >
                    <i
                      className="fas fa-plus-circle"
                      style={{ marginLeft: "8px" }}
                    ></i>
                    تحميل المزيد ({productStats.length - displayedProductsCount}{" "}
                    متبقي)
                  </button>
                </div>
              )}

              {displayedProductsCount >= productStats.length &&
                productStats.length > 10 && (
                  <div
                    style={{
                      textAlign: "center",
                      padding: "1rem",
                      color: "#666",
                      fontSize: "0.9rem",
                      borderTop: "1px solid #eee",
                    }}
                  >
                    <i
                      className="fas fa-check-circle"
                      style={{
                        marginLeft: "8px",
                        color: "var(--primary-color)",
                      }}
                    ></i>
                    تم عرض جميع المنتجات ({productStats.length})
                  </div>
                )}
            </div>
          </div>
        </section>
      )}

      {/* Staff Report */}
      {activeReport === "staff" && (
        <section className="report-content">
          <div className="container">
            <div className="report-header-with-actions">
              <h2>تقرير أداء الموظفين</h2>
              <button className="btn-primary print-btn" onClick={handlePrint}>
                <i className="fas fa-print"></i>
                طباعة التقرير
              </button>
            </div>

            <div className="report-table-card">
              <table className="report-table">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>اسم الموظف</th>
                    <th>عدد المواعيد</th>
                    <th>المواعيد المكتملة</th>
                    <th>نسبة الإنجاز</th>
                    <th>الإيرادات المحققة</th>
                  </tr>
                </thead>
                <tbody>
                  {staffStats.map((staffMember, index) => (
                    <tr key={staffMember.id}>
                      <td>{index + 1}</td>
                      <td>{staffMember.name}</td>
                      <td>{staffMember.appointmentCount}</td>
                      <td>{staffMember.completedCount}</td>
                      <td>
                        {staffMember.appointmentCount > 0
                          ? (
                              (staffMember.completedCount /
                                staffMember.appointmentCount) *
                              100
                            ).toFixed(1)
                          : 0}
                        %
                      </td>
                      <td className="revenue-cell">
                        {staffMember.revenue.toFixed(2)} شيكل
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>
      )}

      {/* Customers Report */}
      {/* {activeReport === "customers" && (
        <section className="report-content">
          <div className="container">
            <div className="report-header-with-actions">
              <h2>تقرير العملاء</h2>
              <button className="btn-primary print-btn" onClick={handlePrint}>
                <i className="fas fa-print"></i>
                طباعة التقرير
              </button>
            </div>

            <div className="customers-summary">
              <div className="summary-stat">
                <h3>إجمالي العملاء</h3>
                <p>{customers.length}</p>
              </div>
              <div className="summary-stat">
                <h3>عملاء نشطين</h3>
                <p>
                  {
                    customerStats.filter(
                      (c) => c.appointmentCount > 0 || c.orderCount > 0,
                    ).length
                  }
                </p>
              </div>
              <div className="summary-stat">
                <h3>متوسط الإنفاق</h3>
                <p>
                  {customerStats.length > 0
                    ? (
                        customerStats.reduce(
                          (sum, c) => sum + c.totalSpent,
                          0,
                        ) / customerStats.filter((c) => c.totalSpent > 0).length
                      ).toFixed(2)
                    : 0}{" "}
                  شيكل
                </p>
              </div>
            </div>

            <div className="report-table-card">
              <h3>أفضل العملاء (حسب الإنفاق)</h3>
              <table className="report-table">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>اسم العميل</th>
                    <th>عدد المواعيد</th>
                    <th>عدد الطلبات</th>
                    <th>إجمالي الإنفاق</th>
                  </tr>
                </thead>
                <tbody>
                  {customerStats.slice(0, 10).map((customer, index) => (
                    <tr key={customer.id}>
                      <td>{index + 1}</td>
                      <td>{customer.name}</td>
                      <td>{customer.appointmentCount}</td>
                      <td>{customer.orderCount}</td>
                      <td className="revenue-cell">
                        {customer.totalSpent.toFixed(2)} شيكل
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>
      )} */}
    </div>
  );
};

export default ReportsPage;
