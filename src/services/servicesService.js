// Services service for Firestore
import {
  collection,
  doc,
  getDocs,
  getDoc,
  setDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "../config/firebase";

// Collection name
const SERVICES_COLLECTION = "services";

// Get all services
export const getAllServices = async () => {
  try {
    const servicesRef = collection(db, SERVICES_COLLECTION);
    const q = query(servicesRef, orderBy("name"));
    const snapshot = await getDocs(q);
    const services = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

    // console.log("servicesService - getAllServices data:", services);
    // console.log("servicesService - First service structure:", services[0]);

    return services;
  } catch (error) {
    console.error("Error getting all services:", error);
    throw error;
  }
};

// Get services by category
export const getServicesByCategory = async (category) => {
  try {
    const servicesRef = collection(db, SERVICES_COLLECTION);
    const q = query(
      servicesRef,
      where("category", "==", category),
      orderBy("name")
    );
    const snapshot = await getDocs(q);
    const services = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));


    return services;
  } catch (error) {
    console.error("Error getting services by category:", error);
    throw error;
  }
};

// Get single service by ID
export const getServiceById = async (serviceId) => {
  try {
    const serviceRef = doc(db, SERVICES_COLLECTION, serviceId);
    const serviceDoc = await getDoc(serviceRef);

    if (serviceDoc.exists()) {
      return {
        id: serviceDoc.id,
        ...serviceDoc.data(),
      };
    } else {
      throw new Error("الخدمة غير موجودة");
    }
  } catch (error) {
    console.error("Error getting service by ID:", error);
    throw error;
  }
};

// Search services by name
export const searchServices = async (searchTerm) => {
  try {
    const servicesRef = collection(db, SERVICES_COLLECTION);
    const snapshot = await getDocs(servicesRef);

    const allServices = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

    // Filter services by name (case-insensitive)
    return allServices.filter(
      (service) =>
        service.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        service.description.toLowerCase().includes(searchTerm.toLowerCase())
    );
  } catch (error) {
    console.error("Error searching services:", error);
    throw error;
  }
};

// Get popular services
export const getPopularServices = async () => {
  try {
    const servicesRef = collection(db, SERVICES_COLLECTION);
    const q = query(
      servicesRef,
      where("popular", "==", true),
      where("hidden", "==", false),
      orderBy("name")
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));
  } catch (error) {
    console.error("Error getting popular services:", error);
    throw error;
  }
};

// Add new service (admin only)
export const addService = async (serviceData) => {
  try {
    const servicesRef = collection(db, SERVICES_COLLECTION);
    const docRef = await addDoc(servicesRef, {
      ...serviceData,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    return {
      id: docRef.id,
      ...serviceData,
    };
  } catch (error) {
    console.error("Error adding service:", error);
    throw error;
  }
};

// Update service (admin only)
export const updateService = async (serviceId, updateData) => {
  try {
    const serviceRef = doc(db, SERVICES_COLLECTION, serviceId);
    await updateDoc(serviceRef, {
      ...updateData,
      updatedAt: serverTimestamp(),
    });

    return {
      id: serviceId,
      ...updateData,
    };
  } catch (error) {
    console.error("Error updating service:", error);
    throw error;
  }
};

// Delete service (admin only)
export const deleteService = async (serviceId) => {
  try {
    const serviceRef = doc(db, SERVICES_COLLECTION, serviceId);
    await deleteDoc(serviceRef);
    return serviceId;
  } catch (error) {
    console.error("Error deleting service:", error);
    throw error;
  }
};

// Set service availability
export const setServiceAvailability = async (serviceId, isAvailable) => {
  try {
    const serviceRef = doc(db, SERVICES_COLLECTION, serviceId);
    await updateDoc(serviceRef, {
      available: isAvailable,
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    console.error("Error updating service availability:", error);
    throw error;
  }
};
