import {
  collection,
  addDoc,
  getDocs,
  doc,
  updateDoc,
  deleteDoc,
  query,
  orderBy,
  where,
  getDoc,
} from "firebase/firestore";
import { db } from "../config/firebase";

// Product Categories
export const getAllProductCategories = async () => {
  try {
    const q = query(
      collection(db, "productCategories"),
      orderBy("name", "asc")
    );
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));
  } catch (error) {
    console.error("Error fetching product categories:", error);
    throw error;
  }
};

export const addProductCategory = async (categoryData) => {
  try {
    const docRef = await addDoc(collection(db, "productCategories"), {
      ...categoryData,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    return docRef.id;
  } catch (error) {
    console.error("Error adding product category:", error);
    throw error;
  }
};

export const updateProductCategory = async (categoryId, categoryData) => {
  try {
    const categoryRef = doc(db, "productCategories", categoryId);
    await updateDoc(categoryRef, {
      ...categoryData,
      updatedAt: new Date(),
    });

    // Update categoryName in all products that use this category
    if (categoryData.name) {
      const productsQuery = query(
        collection(db, "products"),
        where("category", "==", categoryId)
      );
      const productsSnapshot = await getDocs(productsQuery);

      // Update each product with the new category name
      const updatePromises = productsSnapshot.docs.map((productDoc) => {
        const productRef = doc(db, "products", productDoc.id);
        return updateDoc(productRef, {
          categoryName: categoryData.name,
          updatedAt: new Date(),
        });
      });

      await Promise.all(updatePromises);
    }
  } catch (error) {
    console.error("Error updating product category:", error);
    throw error;
  }
};

export const deleteProductCategory = async (categoryId) => {
  try {
    // Check if any products are using this category
    const productsQuery = query(
      collection(db, "products"),
      where("categoryId", "==", categoryId)
    );
    const productsSnapshot = await getDocs(productsQuery);

    if (!productsSnapshot.empty) {
      throw new Error("لا يمكن حذف هذا التصنيف لأنه مستخدم في منتجات موجودة");
    }

    await deleteDoc(doc(db, "productCategories", categoryId));
  } catch (error) {
    console.error("Error deleting product category:", error);
    throw error;
  }
};

// Service Categories
export const getAllServiceCategories = async () => {
  try {
    const q = query(
      collection(db, "serviceCategories"),
      orderBy("name", "asc")
    );
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));
  } catch (error) {
    console.error("Error fetching service categories:", error);
    throw error;
  }
};

export const getServiceCategoryById = async (categoryId) => {
  try {
    const categoryRef = doc(db, "serviceCategories", categoryId);
    const categorySnap = await getDoc(categoryRef);

    if (!categorySnap.exists()) {
      return null;
    }

    return {
      id: categorySnap.id,
      ...categorySnap.data(),
    };
  } catch (error) {
    console.error("Error fetching service category:", error);
    throw error;
  }
};

export const addServiceCategory = async (categoryData) => {
  try {
    const docRef = await addDoc(collection(db, "serviceCategories"), {
      ...categoryData,
      image: categoryData.image || "",
      timeType: categoryData.timeType || "fixed",
      fixedTimeSlots: categoryData.fixedTimeSlots || [],
      forbiddenStartTimes: categoryData.forbiddenStartTimes || [],
      maxEndTime: categoryData.maxEndTime || "16:30",
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    return docRef.id;
  } catch (error) {
    console.error("Error adding service category:", error);
    throw error;
  }
};

export const updateServiceCategory = async (categoryId, categoryData) => {
  try {
    const categoryRef = doc(db, "serviceCategories", categoryId);
    await updateDoc(categoryRef, {
      ...categoryData,
      updatedAt: new Date(),
    });

    // Update categoryName in all services that use this category
    if (categoryData.name) {
      const servicesQuery = query(
        collection(db, "services"),
        where("category", "==", categoryId)
      );
      const servicesSnapshot = await getDocs(servicesQuery);

      // Update each service with the new category name
      const updatePromises = servicesSnapshot.docs.map((serviceDoc) => {
        const serviceRef = doc(db, "services", serviceDoc.id);
        return updateDoc(serviceRef, {
          categoryName: categoryData.name,
          updatedAt: new Date(),
        });
      });

      await Promise.all(updatePromises);
    }
  } catch (error) {
    console.error("Error updating service category:", error);
    throw error;
  }
};

export const deleteServiceCategory = async (categoryId) => {
  try {
    // Check if any services are using this category
    const servicesQuery = query(
      collection(db, "services"),
      where("categoryId", "==", categoryId)
    );
    const servicesSnapshot = await getDocs(servicesQuery);

    if (!servicesSnapshot.empty) {
      throw new Error("لا يمكن حذف هذا التصنيف لأنه مستخدم في خدمات موجودة");
    }

    await deleteDoc(doc(db, "serviceCategories", categoryId));
  } catch (error) {
    console.error("Error deleting service category:", error);
    throw error;
  }
};

// Get products by category
export const getProductsByCategory = async (categoryId) => {
  try {
    const q = query(
      collection(db, "products"),
      where("categoryId", "==", categoryId)
    );
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));
  } catch (error) {
    console.error("Error fetching products by category:", error);
    throw error;
  }
};

// Get services by category
export const getServicesByCategory = async (categoryId) => {
  try {
    const q = query(
      collection(db, "services"),
      where("categoryId", "==", categoryId)
    );
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));
  } catch (error) {
    console.error("Error fetching services by category:", error);
    throw error;
  }
};
