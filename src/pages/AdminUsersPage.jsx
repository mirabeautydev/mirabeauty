import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import "./AdminUsersPage.css";
import {
  getAllUsers,
  adminUpdateCustomer,
  adminUpdateStaff,
  adminDeleteCustomer,
  adminDeleteStaff,
} from "../services/usersService";
import {
  adminRegisterCustomer,
  adminRegisterStaff,
} from "../services/authService";
import LoadingSpinner from "../components/common/LoadingSpinner";
import UserModal from "../components/dashboard/UserModal";
import CustomModal from "../components/common/CustomModal";
import { useModal } from "../hooks/useModal";

const AdminUsersPage = ({ currentUser, userData }) => {
  const navigate = useNavigate();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [roleFilter, setRoleFilter] = useState("all"); // all, customer, staff, admin
  const [isUserModalOpen, setIsUserModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [userModalType, setUserModalType] = useState("customer"); // customer or staff

  const { modalState, closeModal, showSuccess, showError, showConfirm } =
    useModal();

  // Check if user is admin
  useEffect(() => {
    if (!currentUser || !userData || userData.role !== "admin") {
      navigate("/");
    }
  }, [currentUser, userData, navigate]);

  // Load users
  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    setLoading(true);
    try {
      const usersData = await getAllUsers();
      setUsers(usersData);
    } catch (error) {
      console.error("Error loading users:", error);
    } finally {
      setLoading(false);
    }
  };

  // User management handlers
  const handleAddUser = (userType) => {
    setUserModalType(userType);
    setEditingUser(null);
    setIsUserModalOpen(true);
  };

  const handleEditUser = (user) => {
    // Admin and staff should both be treated as "staff" type (no skin type or allergies)
    const userType =
      user.role === "staff" || user.role === "admin" ? "staff" : "customer";
    setUserModalType(userType);
    setEditingUser(user);
    setIsUserModalOpen(true);
  };

  const handleDeleteUser = async (userId, userRole) => {
    // Admin and staff should both be treated as "staff" type
    const userType =
      userRole === "staff" || userRole === "admin" ? "staff" : "customer";
    showConfirm(
      `هل أنت متأكد من حذف هذا ${
        userType === "customer" ? "العميل" : "الموظف"
      }؟\n\nتحذير: سيتم حذف ${
        userType === "customer" ? "العميل" : "الموظف"
      } بشكل نهائي.`,
      async () => {
        try {
          if (userType === "customer") {
            await adminDeleteCustomer(userId);
          } else {
            await adminDeleteStaff(userId);
          }
          await loadUsers();
          showSuccess("تم الحذف بنجاح");
        } catch (error) {
          console.error("Error deleting user:", error);
          showError("حدث خطأ أثناء الحذف");
        }
      },
      `تأكيد حذف ${userType === "customer" ? "العميل" : "الموظف"}`,
      "حذف",
      "إلغاء"
    );
  };

  const handleUserSubmit = async (userData) => {
    try {
      if (editingUser) {
        // Update existing user
        const updateData = { ...userData };
        delete updateData.password; // Don't update password for existing users

        if (userModalType === "customer") {
          await adminUpdateCustomer(editingUser.id, updateData);
        } else {
          await adminUpdateStaff(editingUser.id, updateData);
        }
        showSuccess("تم التحديث بنجاح");
      } else {
        // Add new user
        if (userModalType === "customer") {
          await adminRegisterCustomer(userData);
        } else {
          await adminRegisterStaff(userData);
        }
        showSuccess("تم الإضافة بنجاح");
      }
      await loadUsers();
      setIsUserModalOpen(false);
      setEditingUser(null);
    } catch (error) {
      console.error("Error submitting user:", error);
      showError(error.message || "حدث خطأ أثناء حفظ البيانات");
      throw error;
    }
  };

  const formatDate = (timestamp) => {
    if (!timestamp) return "غير متوفر";
    const date = timestamp.seconds
      ? new Date(timestamp.seconds * 1000)
      : new Date(timestamp);
    return date.toLocaleDateString("en-GB", {
      year: "numeric",
      month: "numeric",
      day: "numeric",
    });
  };

  const getRoleBadge = (role) => {
    switch (role) {
      case "admin":
        return <span className="role-badge admin">مدير</span>;
      case "staff":
        return <span className="role-badge staff">موظف</span>;
      case "customer":
        return <span className="role-badge customer">عميل</span>;
      default:
        return <span className="role-badge customer">عميل</span>;
    }
  };

  // Filter users
  const filteredUsers = users.filter((user) => {
    // Role filter
    if (roleFilter !== "all" && user.role !== roleFilter) return false;

    // Search filter
    if (searchTerm) {
      const search = searchTerm.toLowerCase();
      return (
        user.name?.toLowerCase().includes(search) ||
        user.email?.toLowerCase().includes(search) ||
        user.phone?.toLowerCase().includes(search)
      );
    }

    return true;
  });

  const handleViewUser = (user) => {
    navigate(`/admin/users/${user.slug || user.id}`);
  };

  if (loading) {
    return (
      <div className="admin-users-page">
        <div className="admin-users-loading">
          <LoadingSpinner />
          <p>جاري تحميل المستخدمين...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="admin-users-page">
      <div className="admin-users-container">
        {/* Header */}
        {/* <div className="admin-users-header">
          <div className="header-content">
            <h1>
              <i className="fas fa-users"></i>
              إدارة المستخدمين
            </h1>
            <p>عرض وإدارة جميع مستخدمي النظام</p>
          </div>
        </div> */}

        {/* Statistics */}
        <div className="users-stats-grid">
          <div className="stat-card total">
            <div className="stat-icon">
              <i className="fas fa-users" style={{ color: "var(--white)" }}></i>
            </div>
            <div className="stat-info">
              <h3>إجمالي المستخدمين</h3>
              <p className="stat-number">{users.length}</p>
            </div>
          </div>

          <div className="stat-card customers">
            <div className="stat-icon">
              <i className="fas fa-user" style={{ color: "var(--white)" }}></i>
            </div>
            <div className="stat-info">
              <h3>العملاء</h3>
              <p className="stat-number">
                {users.filter((u) => u.role === "customer" || !u.role).length}
              </p>
            </div>
          </div>

          <div className="stat-card staff">
            <div className="stat-icon">
              <i
                className="fas fa-user-tie"
                style={{ color: "var(--white)" }}
              ></i>
            </div>
            <div className="stat-info">
              <h3>الموظفين</h3>
              <p className="stat-number">
                {users.filter((u) => u.role === "staff").length}
              </p>
            </div>
          </div>

          <div className="stat-card admins">
            <div className="stat-icon">
              <i
                className="fas fa-user-shield"
                style={{ color: "var(--white)" }}
              ></i>
            </div>
            <div className="stat-info">
              <h3>المدراء</h3>
              <p className="stat-number">
                {users.filter((u) => u.role === "admin").length}
              </p>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="users-filters">
          <div className="filter-group">
            <label>نوع المستخدم:</label>
            <div className="filter-buttons">
              <button
                className={`filter-btn ${roleFilter === "all" ? "active" : ""}`}
                onClick={() => setRoleFilter("all")}
              >
                الكل ({users.length})
              </button>
              <button
                className={`filter-btn ${
                  roleFilter === "customer" ? "active" : ""
                }`}
                onClick={() => setRoleFilter("customer")}
              >
                عملاء (
                {users.filter((u) => u.role === "customer" || !u.role).length})
              </button>
              <button
                className={`filter-btn ${
                  roleFilter === "staff" ? "active" : ""
                }`}
                onClick={() => setRoleFilter("staff")}
              >
                موظفين ({users.filter((u) => u.role === "staff").length})
              </button>
              <button
                className={`filter-btn ${
                  roleFilter === "admin" ? "active" : ""
                }`}
                onClick={() => setRoleFilter("admin")}
              >
                مدراء ({users.filter((u) => u.role === "admin").length})
              </button>
            </div>
          </div>

          <div className="user-search-group">
            <i className="fas fa-search"></i>
            <input
              type="text"
              placeholder="بحث عن مستخدم (الاسم، البريد، الهاتف)..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        {/* Add User Buttons */}
        <div className="add-user-buttons">
          <button
            className="btn btn-primary add-user-btn"
            onClick={() => handleAddUser("customer")}
          >
            <i
              className="fas fa-user-plus"
              style={{ color: "var(--white)" }}
            ></i>
            إضافة عميل جديد
          </button>
          <button
            className="btn btn-primary add-user-btn"
            onClick={() => handleAddUser("staff")}
          >
            <i
              className="fas fa-user-tie"
              style={{ color: "var(--white)" }}
            ></i>
            إضافة موظف جديد
          </button>
        </div>

        {/* Users List */}
        <div className="users-list">
          {filteredUsers.length === 0 ? (
            <div className="no-users">
              <i className="fas fa-user-slash"></i>
              <p>لا يوجد مستخدمين</p>
            </div>
          ) : (
            <div className="users-table-card">
              <table className="users-table">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>الصورة</th>
                    <th>الاسم</th>
                    <th>البريد الإلكتروني</th>
                    <th>الهاتف</th>
                    <th>الدور</th>
                    <th>تاريخ التسجيل</th>
                    <th>الإجراءات</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredUsers.map((user, index) => (
                    <tr key={user.id}>
                      <td>{index + 1}</td>
                      <td>
                        <div className="user-avatar">
                          <img
                            src={user.avatar || "/assets/default-avatar.jpg"}
                            alt={user.name}
                          />
                        </div>
                      </td>
                      <td>
                        <strong>{user.name || "غير متوفر"}</strong>
                      </td>
                      <td>{user.email}</td>
                      <td>{user.phone || "غير متوفر"}</td>
                      <td>{getRoleBadge(user.role)}</td>
                      <td>{formatDate(user.createdAt)}</td>
                      <td>
                        <div className="action-buttons-group">
                          <button
                            className="users-action-btn edit"
                            onClick={() => handleEditUser(user)}
                            title="تعديل المستخدم"
                          >
                            <i className="fas fa-edit"></i>
                          </button>
                          <button
                            className="users-action-btn view"
                            onClick={() => handleViewUser(user)}
                            title="عرض التفاصيل"
                          >
                            <i className="fas fa-eye"></i>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* User Modal */}
      {isUserModalOpen && (
        <UserModal
          isOpen={isUserModalOpen}
          onClose={() => {
            setIsUserModalOpen(false);
            setEditingUser(null);
          }}
          onSubmit={handleUserSubmit}
          user={editingUser}
          userType={userModalType}
        />
      )}

      {/* Custom Modal for confirmations */}
      <CustomModal />
    </div>
  );
};

export default AdminUsersPage;
