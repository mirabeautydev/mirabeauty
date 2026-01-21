import React, { createContext, useContext, useState, useEffect } from "react";

// Create Loading Context
const LoadingContext = createContext();

// Loading Provider Component
export const LoadingProvider = ({ children }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [loadingTasks, setLoadingTasks] = useState({});

  const showLoading = () => {
    setIsLoading(true);
    setProgress(0);
    setLoadingTasks({});
  };

  const hideLoading = () => {
    setProgress(100);
    // Small delay to show 100% before hiding
    setTimeout(() => {
      setIsLoading(false);
      setProgress(0);
      setLoadingTasks({});
    }, 300);
  };

  // Track individual loading tasks
  const registerTask = (taskId) => {
    setLoadingTasks((prev) => ({
      ...prev,
      [taskId]: { completed: false, progress: 0 },
    }));
  };

  const updateTaskProgress = (taskId, taskProgress) => {
    setLoadingTasks((prev) => ({
      ...prev,
      [taskId]: { completed: false, progress: taskProgress },
    }));
  };

  const completeTask = (taskId) => {
    setLoadingTasks((prev) => ({
      ...prev,
      [taskId]: { completed: true, progress: 100 },
    }));
  };

  // Calculate overall progress based on all tasks
  useEffect(() => {
    const tasks = Object.values(loadingTasks);
    if (tasks.length === 0) return;

    const totalProgress = tasks.reduce((sum, task) => sum + task.progress, 0);
    const overallProgress = totalProgress / tasks.length;
    setProgress(Math.min(overallProgress, 100));
  }, [loadingTasks]);

  // Real loading with task tracking
  const withLoading = async (asyncFunction, options = {}) => {
    const { minLoadingTime = 500, taskId = "main" } = options;

    showLoading();
    registerTask(taskId);
    const startTime = Date.now();

    try {
      // If the function returns a progress callback, use it
      const result = await asyncFunction((taskProgress) => {
        updateTaskProgress(taskId, taskProgress);
      });

      completeTask(taskId);

      // Ensure minimum loading time for better UX
      const elapsedTime = Date.now() - startTime;
      const remainingTime = Math.max(0, minLoadingTime - elapsedTime);

      if (remainingTime > 0) {
        await new Promise((resolve) => setTimeout(resolve, remainingTime));
      }

      return result;
    } catch (error) {
      completeTask(taskId);
      throw error;
    } finally {
      hideLoading();
    }
  };

  // Track multiple parallel operations
  const withMultipleLoading = async (operations) => {
    showLoading();
    const startTime = Date.now();

    // Register all tasks
    operations.forEach((op, index) => {
      const taskId = op.taskId || `task-${index}`;
      registerTask(taskId);
    });

    try {
      const promises = operations.map((op, index) => {
        const taskId = op.taskId || `task-${index}`;

        return op
          .fn((taskProgress) => {
            updateTaskProgress(taskId, taskProgress);
          })
          .then((result) => {
            completeTask(taskId);
            return result;
          });
      });

      const results = await Promise.all(promises);

      // Ensure minimum loading time
      const elapsedTime = Date.now() - startTime;
      const minTime = operations[0]?.minLoadingTime || 500;
      const remainingTime = Math.max(0, minTime - elapsedTime);

      if (remainingTime > 0) {
        await new Promise((resolve) => setTimeout(resolve, remainingTime));
      }

      return results;
    } catch (error) {
      throw error;
    } finally {
      hideLoading();
    }
  };

  // Preload images with real progress
  const preloadImages = (imageUrls) => {
    return new Promise((resolve) => {
      if (!imageUrls || imageUrls.length === 0) {
        resolve([]);
        return;
      }

      let loadedCount = 0;
      const totalImages = imageUrls.length;
      const results = [];

      imageUrls.forEach((url, index) => {
        const img = new Image();

        img.onload = () => {
          loadedCount++;
          results[index] = { url, success: true };
          const progress = (loadedCount / totalImages) * 100;
          updateTaskProgress("images", progress);

          if (loadedCount === totalImages) {
            completeTask("images");
            resolve(results);
          }
        };

        img.onerror = () => {
          loadedCount++;
          results[index] = { url, success: false };
          const progress = (loadedCount / totalImages) * 100;
          updateTaskProgress("images", progress);

          if (loadedCount === totalImages) {
            completeTask("images");
            resolve(results);
          }
        };

        img.src = url;
      });
    });
  };

  const value = {
    isLoading,
    progress,
    showLoading,
    hideLoading,
    withLoading,
    withMultipleLoading,
    registerTask,
    updateTaskProgress,
    completeTask,
    preloadImages,
  };

  return (
    <LoadingContext.Provider value={value}>{children}</LoadingContext.Provider>
  );
};

// Custom hook to use loading context
export const useLoading = () => {
  const context = useContext(LoadingContext);

  if (!context) {
    throw new Error("useLoading must be used within a LoadingProvider");
  }

  return context;
};

export default useLoading;
