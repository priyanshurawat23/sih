// Reads from Expo's environment or falls back to localhost for development.
// On Vercel, set EXPO_PUBLIC_API_URL to your Render backend URL.

const ENV_URL = typeof process !== 'undefined' && process.env && process.env.EXPO_PUBLIC_API_URL;
export const BASE_URL = ENV_URL || 'http://localhost:8000';

export const uploadReport = async (fileUri, fileName, fileType, language = 'en') => {
  try {
    const formData = new FormData();
    formData.append('file', {
      uri: fileUri,
      name: fileName,
      type: fileType || 'application/pdf',
    });

    const response = await fetch(`${BASE_URL}/api/upload?language=${language}`, {
      method: 'POST',
      body: formData,
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });

    if (!response.ok) {
      throw new Error(`Upload failed with status ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error('API uploadReport error:', error);
    throw error;
  }
};

export const getHistory = async (userId = 1) => {
  try {
    const response = await fetch(`${BASE_URL}/api/history/${userId}`);
    if (!response.ok) {
      throw new Error(`History fetch failed with status ${response.status}`);
    }
    return await response.json();
  } catch (error) {
    console.error('API getHistory error:', error);
    throw error;
  }
};

export const getReport = async (reportId) => {
  try {
    const response = await fetch(`${BASE_URL}/api/report/${reportId}`);
    if (!response.ok) {
      throw new Error(`Report fetch failed with status ${response.status}`);
    }
    return await response.json();
  } catch (error) {
    console.error('API getReport error:', error);
    throw error;
  }
};

export const getHealth = async () => {
  try {
    const response = await fetch(`${BASE_URL}/health`);
    if (!response.ok) {
      throw new Error(`Health check failed with status ${response.status}`);
    }
    return await response.json();
  } catch (error) {
    console.error('API getHealth error:', error);
    throw error;
  }
};
