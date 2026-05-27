import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

const apiClient = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

export const api = {
  // Fetch user profile from database
  fetchProfile: async (clerkId) => {
    try {
      const response = await apiClient.get(`/profile/${clerkId}`);
      return response.data; // { role: 'student'|'tutor', profile: {...} }
    } catch (error) {
      if (error.response && error.response.status === 404) {
        return null;
      }
      throw error;
    }
  },

  // Create new profile after registration
  createProfile: async (profileData) => {
    const response = await apiClient.post('/profile', profileData);
    return response.data;
  },

  // Fetch online tutors list
  fetchTutors: async () => {
    const response = await apiClient.get('/tutors');
    return response.data;
  },

  // Initiate real-time video session
  startSession: async (studentClerkId, tutorClerkId) => {
    const response = await apiClient.post('/session/start', { studentClerkId, tutorClerkId });
    return response.data; // returns session object { id, dailyRoomUrl, studentClerkId, tutorRate }
  },

  // Complete video session & calculate charges
  endSession: async (sessionId, durationSeconds) => {
    const response = await apiClient.post('/session/end', { sessionId, durationSeconds });
    return response.data; // returns { session, cost }
  },

  // Check if there is an active session (for incoming call polling)
  fetchActiveSession: async (clerkId) => {
    try {
      const response = await apiClient.get(`/session/active/${clerkId}`);
      return response.data;
    } catch (error) {
      if (error.response && error.response.status === 404) {
        return null;
      }
      throw error;
    }
  },

  // Toggle tutor online availability
  toggleStatus: async (clerkId, isOnline) => {
    const response = await apiClient.post('/profile/status', { clerkId, isOnline });
    return response.data;
  },

  // Decline an active session request
  declineSession: async (sessionId) => {
    const response = await apiClient.post('/session/decline', { sessionId });
    return response.data;
  },

  // Deposit funds to wallet via BLIK
  depositFunds: async (clerkId, amount) => {
    const response = await apiClient.post('/wallet/deposit', { clerkId, amount });
    return response.data;
  },

  // Fetch completed sessions history
  fetchSessionHistory: async (clerkId) => {
    const response = await apiClient.get(`/session/history/${clerkId}`);
    return response.data;
  },

  // Seed demo tutors for presentation
  seedDatabase: async () => {
    const response = await apiClient.post('/db/seed');
    return response.data;
  }
};
