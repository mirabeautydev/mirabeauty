import {
  collection,
  doc,
  getDocs,
  getDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "../config/firebase";

const APPOINTMENTS_COLLECTION = "appointments";

// Generate unique appointment ID
const generateAppointmentId = () => {
  const timestamp = Date.now();
  const random = Math.floor(Math.random() * 1000);
  return `APT-${timestamp}-${random}`;
};

// Get all appointments
export const getAllAppointments = async () => {
  try {
    const appointmentsCollection = collection(db, APPOINTMENTS_COLLECTION);
    const appointmentsQuery = query(
      appointmentsCollection,
      orderBy("createdAt", "desc"),
    );
    const snapshot = await getDocs(appointmentsQuery);

    const appointments = [];
    snapshot.forEach((doc) => {
      appointments.push({
        id: doc.id,
        ...doc.data(),
      });
    });

    return appointments;
  } catch (error) {
    console.error("Error fetching appointments:", error);
    throw error;
  }
};

// Get appointments by customer ID
export const getAppointmentsByCustomer = async (customerId) => {
  try {
    const appointmentsCollection = collection(db, APPOINTMENTS_COLLECTION);
    const appointmentsQuery = query(
      appointmentsCollection,
      where("customerId", "==", customerId),
      orderBy("createdAt", "desc"),
    );
    const snapshot = await getDocs(appointmentsQuery);

    const appointments = [];
    snapshot.forEach((doc) => {
      appointments.push({
        id: doc.id,
        ...doc.data(),
      });
    });

    return appointments;
  } catch (error) {
    console.error("Error fetching customer appointments:", error);
    throw error;
  }
};

// Get appointments by staff ID
export const getAppointmentsByStaff = async (staffId) => {
  try {
    const appointmentsCollection = collection(db, APPOINTMENTS_COLLECTION);
    const appointmentsQuery = query(
      appointmentsCollection,
      where("staffId", "==", staffId),
      orderBy("createdAt", "desc"),
    );
    const snapshot = await getDocs(appointmentsQuery);

    const appointments = [];
    snapshot.forEach((doc) => {
      appointments.push({
        id: doc.id,
        ...doc.data(),
      });
    });

    return appointments;
  } catch (error) {
    console.error("Error fetching staff appointments:", error);
    throw error;
  }
};

// Get appointments by status
export const getAppointmentsByStatus = async (status) => {
  try {
    const appointmentsCollection = collection(db, APPOINTMENTS_COLLECTION);
    const appointmentsQuery = query(
      appointmentsCollection,
      where("status", "==", status),
      orderBy("createdAt", "desc"),
    );
    const snapshot = await getDocs(appointmentsQuery);

    const appointments = [];
    snapshot.forEach((doc) => {
      appointments.push({
        id: doc.id,
        ...doc.data(),
      });
    });

    return appointments;
  } catch (error) {
    console.error("Error fetching appointments by status:", error);
    throw error;
  }
};

// Create new appointment/booking
export const createAppointment = async (appointmentData) => {
  try {
    const appointmentsCollection = collection(db, APPOINTMENTS_COLLECTION);

    // Generate appointment number
    const appointmentNumber = generateAppointmentId();

    const appointmentDoc = await addDoc(appointmentsCollection, {
      appointmentNumber,
      customerId: appointmentData.customerId,
      customerName: appointmentData.customerName,
      customerEmail: appointmentData.customerEmail,
      customerPhone: appointmentData.customerPhone,
      serviceId: appointmentData.serviceId,
      serviceName: appointmentData.serviceName,
      serviceCategory: appointmentData.serviceCategory,
      servicePrice: appointmentData.servicePrice,
      serviceOption: appointmentData.serviceOption || null,
      serviceDuration: appointmentData.serviceDuration,
      staffId: appointmentData.staffId,
      staffName: appointmentData.staffName,
      date: appointmentData.date,
      time: appointmentData.time,
      notes: appointmentData.notes || "",
      status: "في الانتظار", // pending
      paymentStatus: "في الانتظار", // pending payment
      couponCode: appointmentData.couponCode || null,
      couponValue: appointmentData.couponValue || 0,
      couponDiscountType: appointmentData.couponDiscountType || null,
      discount: appointmentData.discount || 0,
      createdBy: appointmentData.createdBy || null, // Admin who created it
      createdByAdmin: appointmentData.createdByAdmin || false, // Flag for admin-created
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    return {
      id: appointmentDoc.id,
      appointmentNumber,
    };
  } catch (error) {
    console.error("Error creating appointment:", error);
    throw error;
  }
};

// Update appointment
export const updateAppointment = async (appointmentId, updateData) => {
  try {
    const appointmentDoc = doc(db, APPOINTMENTS_COLLECTION, appointmentId);
    await updateDoc(appointmentDoc, {
      ...updateData,
      updatedAt: serverTimestamp(),
    });

    return appointmentId;
  } catch (error) {
    console.error("Error updating appointment:", error);
    throw error;
  }
};

// Update appointment status
export const updateAppointmentStatus = async (appointmentId, status) => {
  try {
    const appointmentDoc = doc(db, APPOINTMENTS_COLLECTION, appointmentId);
    await updateDoc(appointmentDoc, {
      status,
      updatedAt: serverTimestamp(),
    });

    return appointmentId;
  } catch (error) {
    console.error("Error updating appointment status:", error);
    throw error;
  }
};

// Cancel appointment
export const cancelAppointment = async (appointmentId, reason = "") => {
  try {
    const appointmentDoc = doc(db, APPOINTMENTS_COLLECTION, appointmentId);
    await updateDoc(appointmentDoc, {
      status: "ملغي", // cancelled
      cancellationReason: reason,
      cancelledAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    return appointmentId;
  } catch (error) {
    console.error("Error cancelling appointment:", error);
    throw error;
  }
};

// Confirm appointment
export const confirmAppointment = async (appointmentId) => {
  try {
    const appointmentDoc = doc(db, APPOINTMENTS_COLLECTION, appointmentId);
    await updateDoc(appointmentDoc, {
      status: "مؤكد", // confirmed
      confirmedAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    return appointmentId;
  } catch (error) {
    console.error("Error confirming appointment:", error);
    throw error;
  }
};

// Complete appointment
// noteFromStaffToCustomer will be stored in `staffNoteToCustomer` (and kept in `customerNote` for compatibility)
export const completeAppointment = async (
  appointmentId,
  staffNoteToCustomer = "",
  staffInternalNote = "",
  actualPaidAmount = null,
) => {
  try {
    const appointmentDoc = doc(db, APPOINTMENTS_COLLECTION, appointmentId);
    const updateData = {
      status: "مكتمل", // completed
      completedAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      // staff -> customer note: prefer new field
      staffNoteToCustomer: staffNoteToCustomer,
      // internal note visible only to staff/admin
      staffInternalNote: staffInternalNote,
    };

    // Add actual paid amount if provided
    if (actualPaidAmount !== null && actualPaidAmount !== undefined) {
      updateData.actualPaidAmount = actualPaidAmount;
    }

    await updateDoc(appointmentDoc, updateData);

    return appointmentId;
  } catch (error) {
    console.error("Error completing appointment:", error);
    throw error;
  }
};

// Delete appointment
export const deleteAppointment = async (appointmentId) => {
  try {
    const appointmentDoc = doc(db, APPOINTMENTS_COLLECTION, appointmentId);
    await deleteDoc(appointmentDoc);

    return appointmentId;
  } catch (error) {
    console.error("Error deleting appointment:", error);
    throw error;
  }
};

// Get appointment by ID
export const getAppointmentById = async (appointmentId) => {
  try {
    const appointmentDoc = doc(db, APPOINTMENTS_COLLECTION, appointmentId);
    const snapshot = await getDoc(appointmentDoc);

    if (snapshot.exists()) {
      return {
        id: snapshot.id,
        ...snapshot.data(),
      };
    } else {
      throw new Error("Appointment not found");
    }
  } catch (error) {
    console.error("Error fetching appointment:", error);
    throw error;
  }
};

// Check staff availability for a specific date and time
export const checkStaffAvailability = async (staffId, date, time) => {
  try {
    const appointmentsCollection = collection(db, APPOINTMENTS_COLLECTION);
    const appointmentsQuery = query(
      appointmentsCollection,
      where("staffId", "==", staffId),
      where("date", "==", date),
      where("time", "==", time),
      where("status", "in", ["في الانتظار", "مؤكد"]), // pending or confirmed
    );
    const snapshot = await getDocs(appointmentsQuery);

    return snapshot.empty; // true if available, false if not
  } catch (error) {
    console.error("Error checking staff availability:", error);
    throw error;
  }
};

// Helper function to convert time string (HH:MM) to minutes since midnight
const timeToMinutes = (timeStr) => {
  const [hours, minutes] = timeStr.split(":").map(Number);
  return hours * 60 + minutes;
};

// Check if staff is available for a time range (considering appointment duration)
export const checkStaffAvailabilityWithDuration = async (
  staffId,
  date,
  startTime,
  durationMinutes,
  excludeAppointmentId = null,
) => {
  try {
    // Get all appointments for this staff on this date
    const appointmentsCollection = collection(db, APPOINTMENTS_COLLECTION);
    const appointmentsQuery = query(
      appointmentsCollection,
      where("staffId", "==", staffId),
      where("date", "==", date),
      where("status", "in", ["في الانتظار", "مؤكد"]),
    );
    const snapshot = await getDocs(appointmentsQuery);

    // Calculate new appointment time range
    const newStartMinutes = timeToMinutes(startTime);
    const newEndMinutes = newStartMinutes + parseInt(durationMinutes);

    // Check for overlaps
    const conflicts = [];
    snapshot.forEach((doc) => {
      const appointment = { id: doc.id, ...doc.data() };

      // Skip if this is the appointment being edited
      if (excludeAppointmentId && appointment.id === excludeAppointmentId) {
        return;
      }

      // Get existing appointment time range
      const existingStartMinutes = timeToMinutes(appointment.time);
      const existingDuration =
        parseInt(appointment.serviceDuration || appointment.duration) || 60;
      const existingEndMinutes = existingStartMinutes + existingDuration;

      // Check for overlap: new appointment overlaps if:
      // - new start is before existing end AND new end is after existing start
      if (
        newStartMinutes < existingEndMinutes &&
        newEndMinutes > existingStartMinutes
      ) {
        conflicts.push({
          appointmentId: appointment.id,
          customerName: appointment.customerName,
          serviceName: appointment.serviceName,
          time: appointment.time,
          duration: existingDuration,
        });
      }
    });

    return {
      available: conflicts.length === 0,
      conflicts: conflicts,
    };
  } catch (error) {
    console.error("Error checking staff availability with duration:", error);
    throw error;
  }
};

// Get appointments for a specific date
export const getAppointmentsByDate = async (date) => {
  try {
    const appointmentsCollection = collection(db, APPOINTMENTS_COLLECTION);
    const appointmentsQuery = query(
      appointmentsCollection,
      where("date", "==", date),
      orderBy("time", "asc"),
    );
    const snapshot = await getDocs(appointmentsQuery);

    const appointments = [];
    snapshot.forEach((doc) => {
      appointments.push({
        id: doc.id,
        ...doc.data(),
      });
    });

    return appointments;
  } catch (error) {
    console.error("Error fetching appointments by date:", error);
    throw error;
  }
};

// Get appointments for a specific user (for UserDetailsPage)
export const getUserAppointments = async (userId) => {
  try {
    const appointmentsCollection = collection(db, APPOINTMENTS_COLLECTION);
    const appointmentsQuery = query(
      appointmentsCollection,
      where("customerId", "==", userId),
      orderBy("createdAt", "desc"),
    );
    const snapshot = await getDocs(appointmentsQuery);

    const appointments = [];
    snapshot.forEach((doc) => {
      appointments.push({
        id: doc.id,
        ...doc.data(),
      });
    });

    return appointments;
  } catch (error) {
    console.error("Error fetching user appointments:", error);
    throw error;
  }
};
