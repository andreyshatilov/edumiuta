import axios from 'axios';

// Get base URL and ensure it has the /api prefix to match backend endpoints
const getBaseUrl = () => {
  let url = import.meta.env.VITE_API_URL || 'http://localhost:3001';
  // Strip trailing slash if present
  if (url.endsWith('/')) {
    url = url.slice(0, -1);
  }
  // Append /api if not already present
  if (!url.endsWith('/api')) {
    url = `${url}/api`;
  }
  return url;
};

const apiClient = axios.create({
  baseURL: getBaseUrl(),
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

  // Update student or tutor profile details
  updateProfile: async (profileData) => {
    const response = await apiClient.put('/profile/update', profileData);
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

  // Fetch session details by session ID
  fetchSession: async (sessionId) => {
    const response = await apiClient.get(`/session/${sessionId}`);
    return response.data;
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

  // Submit tutor review and update their average rating
  submitReview: async (tutorClerkId, rating) => {
    const response = await apiClient.post('/tutor/review', { tutorClerkId, rating });
    return response.data;
  },

  // Fetch messages between two users
  fetchChatMessages: async (userA, userB) => {
    const response = await apiClient.get(`/chat/messages/${userA}/${userB}`);
    return response.data;
  },

  // Fetch all conversations for a user
  fetchConversations: async (clerkId) => {
    const response = await apiClient.get(`/chat/conversations/${clerkId}`);
    return response.data;
  },

  // Send message
  sendChatMessage: async (senderId, receiverId, text, senderRole) => {
    const response = await apiClient.post('/chat/send', { senderId, receiverId, text, senderRole });
    return response.data;
  },

  // Seed demo tutors for presentation
  seedDatabase: async () => {
    const response = await apiClient.post('/db/seed');
    return response.data;
  }
};
