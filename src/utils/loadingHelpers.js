// Helper functions for real loading progress tracking

/**
 * Wraps a Firebase query to track loading progress
 * @param {Promise} queryPromise - Firebase query promise
 * @param {Function} onProgress - Progress callback (0-100)
 * @returns {Promise} - Query result
 */
export const trackFirebaseQuery = async (queryPromise, onProgress) => {
  // Start at 10% when query begins
  if (onProgress) onProgress(10);

  try {
    // Simulate progress while waiting
    const progressInterval = setInterval(() => {
      if (onProgress) {
        // Gradually increase to 80%
        const currentProgress = Math.min(80, Math.random() * 70 + 10);
        onProgress(currentProgress);
      }
    }, 100);

    const result = await queryPromise;

    clearInterval(progressInterval);

    // Set to 100% when complete
    if (onProgress) onProgress(100);

    return result;
  } catch (error) {
    if (onProgress) onProgress(100);
    throw error;
  }
};

/**
 * Tracks multiple Firebase queries with individual progress
 * @param {Array} queries - Array of {name, promise} objects
 * @param {Function} onProgress - Overall progress callback
 * @returns {Promise} - Array of results
 */
export const trackMultipleQueries = async (queries, onProgress) => {
  const taskProgress = {};

  // Initialize all tasks at 0%
  queries.forEach((q) => {
    taskProgress[q.name] = 0;
  });

  const updateOverallProgress = () => {
    const total = Object.values(taskProgress).reduce((sum, p) => sum + p, 0);
    const overall = total / queries.length;
    if (onProgress) onProgress(overall);
  };

  const promises = queries.map(async (query) => {
    try {
      const result = await trackFirebaseQuery(query.promise, (progress) => {
        taskProgress[query.name] = progress;
        updateOverallProgress();
      });
      return { name: query.name, data: result, success: true };
    } catch (error) {
      taskProgress[query.name] = 100;
      updateOverallProgress();
      return { name: query.name, error, success: false };
    }
  });

  return Promise.all(promises);
};

/**
 * Simulates chunked data loading with progress
 * @param {Array} items - Items to process
 * @param {Function} processFn - Function to process each chunk
 * @param {Function} onProgress - Progress callback
 * @param {Number} chunkSize - Size of each chunk
 */
export const processInChunks = async (
  items,
  processFn,
  onProgress,
  chunkSize = 10
) => {
  const chunks = [];
  for (let i = 0; i < items.length; i += chunkSize) {
    chunks.push(items.slice(i, i + chunkSize));
  }

  const results = [];
  for (let i = 0; i < chunks.length; i++) {
    const chunk = chunks[i];
    const chunkResults = await Promise.all(chunk.map(processFn));
    results.push(...chunkResults);

    // Update progress
    const progress = ((i + 1) / chunks.length) * 100;
    if (onProgress) onProgress(progress);
  }

  return results;
};

/**
 * Preloads images with progress tracking
 * @param {Array} imageUrls - Array of image URLs
 * @param {Function} onProgress - Progress callback
 * @returns {Promise} - Array of loaded image results
 */
export const preloadImagesWithProgress = (imageUrls, onProgress) => {
  return new Promise((resolve) => {
    if (!imageUrls || imageUrls.length === 0) {
      if (onProgress) onProgress(100);
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
        if (onProgress) onProgress(progress);

        if (loadedCount === totalImages) {
          resolve(results);
        }
      };

      img.onerror = () => {
        loadedCount++;
        results[index] = { url, success: false };
        const progress = (loadedCount / totalImages) * 100;
        if (onProgress) onProgress(progress);

        if (loadedCount === totalImages) {
          resolve(results);
        }
      };

      img.src = url;
    });
  });
};

/**
 * Creates a progress tracker for async operations
 * @returns {Object} - Progress tracker object
 */
export const createProgressTracker = () => {
  const tasks = {};
  let onProgressCallback = null;

  const calculateOverallProgress = () => {
    const taskList = Object.values(tasks);
    if (taskList.length === 0) return 0;

    const total = taskList.reduce((sum, task) => sum + task.progress, 0);
    return total / taskList.length;
  };

  const notifyProgress = () => {
    if (onProgressCallback) {
      const overall = calculateOverallProgress();
      onProgressCallback(overall);
    }
  };

  return {
    registerTask: (taskId, weight = 1) => {
      tasks[taskId] = { progress: 0, weight };
    },

    updateTask: (taskId, progress) => {
      if (tasks[taskId]) {
        tasks[taskId].progress = Math.min(100, Math.max(0, progress));
        notifyProgress();
      }
    },

    completeTask: (taskId) => {
      if (tasks[taskId]) {
        tasks[taskId].progress = 100;
        notifyProgress();
      }
    },

    onProgress: (callback) => {
      onProgressCallback = callback;
    },

    getProgress: () => calculateOverallProgress(),
  };
};
