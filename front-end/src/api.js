// Reads from Expo's environment or falls back to localhost for development.
// On Vercel, set EXPO_PUBLIC_API_URL to your Render backend URL.

import { Platform } from 'react-native';

const ENV_URL = typeof process !== 'undefined' && process.env && process.env.EXPO_PUBLIC_API_URL;
export const BASE_URL = ENV_URL || 'http://localhost:8000';

export const uploadReport = async (fileData, fileName, fileType = 'application/pdf', language = 'en') => {
  try {
    const formData = new FormData();

    if (Platform.OS === 'web') {
      if (typeof File !== 'undefined' && fileData instanceof File) {
        formData.append('file', fileData, fileName || fileData.name);
      } else if (typeof Blob !== 'undefined' && fileData instanceof Blob) {
        formData.append('file', fileData, fileName || 'document.pdf');
      } else if (typeof fileData === 'string' && (fileData.startsWith('data:') || fileData.startsWith('blob:'))) {
        const res = await fetch(fileData);
        const blob = await res.blob();
        formData.append('file', blob, fileName || 'document.pdf');
      } else {
        formData.append('file', fileData, fileName || 'document.pdf');
      }
    } else {
      formData.append('file', {
        uri: typeof fileData === 'string' ? fileData : fileData?.uri,
        name: fileName || 'document.pdf',
        type: fileType || 'application/pdf',
      });
    }

    const response = await fetch(`${BASE_URL}/api/upload?language=${language}`, {
      method: 'POST',
      body: formData,
      // Note: Do NOT set 'Content-Type': 'multipart/form-data'.
      // Fetch automatically sets Content-Type along with the multipart boundary.
    });

    if (!response.ok) {
      let errDetail = `Upload failed with status ${response.status}`;
      try {
        const errJson = await response.json();
        if (errJson.detail) errDetail = errJson.detail;
      } catch (_) {}
      throw new Error(errDetail);
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
