// Reads from Expo's environment or falls back to localhost for development.
// On Vercel, set EXPO_PUBLIC_API_URL to your Render backend URL.

import { Platform } from 'react-native';

const getBaseUrl = () => {
  if (typeof process !== 'undefined' && process.env) {
    const envUrl =
      process.env.EXPO_PUBLIC_API_URL ||
      process.env.REACT_APP_API_URL ||
      process.env.NEXT_PUBLIC_API_URL ||
      process.env.VITE_API_URL ||
      process.env.API_URL;
    if (envUrl) {
      return envUrl.replace(/\/+$/, '');
    }
  }

  if (typeof window !== 'undefined') {
    if (window.__ENV__ && window.__ENV__.API_URL) {
      return window.__ENV__.API_URL.replace(/\/+$/, '');
    }
    try {
      const stored = window.localStorage?.getItem('API_URL');
      if (stored) return stored.replace(/\/+$/, '');
    } catch (_) {}
  }

  return 'http://localhost:8000';
};

export const BASE_URL = getBaseUrl();

const formatFetchError = (error, context = 'request') => {
  console.error(`API ${context} error:`, error);
  if (
    error instanceof TypeError &&
    (error.message.includes('Failed to fetch') ||
      error.message.includes('Network') ||
      error.message.includes('NetworkError'))
  ) {
    return new Error(
      `Unable to connect to backend server at ${BASE_URL}. Ensure backend is running and CORS is enabled.`
    );
  }
  return error;
};

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
      if (response.status === 413) {
        errDetail = 'File too large. Please upload a smaller document.';
      } else if (response.status === 502 || response.status === 503) {
        errDetail = 'Backend service is starting up or unavailable. Please try again in a few seconds.';
      } else {
        try {
          const errJson = await response.json();
          if (errJson.detail) errDetail = errJson.detail;
        } catch (_) {}
      }
      throw new Error(errDetail);
    }

    return await response.json();
  } catch (error) {
    throw formatFetchError(error, 'uploadReport');
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
    throw formatFetchError(error, 'getHistory');
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
    throw formatFetchError(error, 'getReport');
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
    throw formatFetchError(error, 'getHealth');
  }
};

