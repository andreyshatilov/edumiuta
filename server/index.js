import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import axios from 'axios';
import path from 'path';
import { fileURLToPath } from 'url';
import { WebSocketServer } from 'ws';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
dotenv.config({ path: path.join(__dirname, '.env') });

const app = express();
const PORT = process.env.PORT || 3001;
const FLOTIQ_API_KEY = process.env.FLOTIQ_API_KEY;
const DAILY_API_KEY = process.env.DAILY_API_KEY;

if (!FLOTIQ_API_KEY || FLOTIQ_API_KEY === 'your_flotiq_rw_api_key_here') {
  console.error('❌ Błąd krytyczny: FLOTIQ_API_KEY jest wymagany do uruchomienia serwera!');
  process.exit(1);
}

app.use(cors());
app.use(express.json());

// Helper for Flotiq requests
const flotiqClient = axios.create({
  baseURL: 'https://api.flotiq.com/api/v1/content',
  headers: {
    'X-Auth-Token': FLOTIQ_API_KEY,
    'Content-Type': 'application/json',
  },
});

// 1. GET User profile (Student or Tutor)
app.get('/api/profile/:clerkId', async (req, res) => {
  const { clerkId } = req.params;
  try {
    // Search in student_profile
    const studentFilter = encodeURIComponent(JSON.stringify({ clerkId: { type: 'equals', filter: clerkId } }));
    const studentRes = await flotiqClient.get(`/student_profile?filters=${studentFilter}`);
    
    if (studentRes.data.data && studentRes.data.data.length > 0) {
      return res.json({ role: 'student', profile: studentRes.data.data[0] });
    }

    // Search in tutor_profile
    const tutorFilter = encodeURIComponent(JSON.stringify({ clerkId: { type: 'equals', filter: clerkId } }));
    const tutorRes = await flotiqClient.get(`/tutor_profile?filters=${tutorFilter}`);
    
    if (tutorRes.data.data && tutorRes.data.data.length > 0) {
      const tutor = tutorRes.data.data[0];
      let totalEarnings = 0.00;
      try {
        const transFilter = encodeURIComponent(JSON.stringify({ clerkId: { type: 'equals', filter: clerkId } }));
        const transRes = await flotiqClient.get(`/wallet_transaction?filters=${transFilter}`);
        if (transRes.data.data) {
          totalEarnings = transRes.data.data
            .filter(t => t.type === 'earnings')
            .reduce((sum, t) => sum + parseFloat(t.amount || 0), 0);
        }
      } catch (err) {
        console.error("Error summing tutor earnings:", err);
      }
      return res.json({ role: 'tutor', profile: { ...tutor, totalEarnings } });
    }

    return res.status(404).json({ message: 'Profile not found' });
  } catch (error) {
    console.error('Error fetching profile from Flotiq:', error.response?.data || error.message);
    res.status(500).json({ error: 'Database query failed' });
  }
});

// 2. POST Create User profile (Student or Tutor)
app.post('/api/profile', async (req, res) => {
  const { clerkId, name, role, university, subject, pricePerMinute, bio, imageUrl } = req.body;

  if (!clerkId || !name || !role) {
    return res.status(400).json({ error: 'Missing required fields (clerkId, name, role)' });
  }

  try {
    if (role === 'student') {
      const payload = {
        clerkId,
        name,
        walletBalance: 100.00 // Welcome balance in PLN
      };
      const response = await flotiqClient.post('/student_profile', payload);
      return res.json({ role: 'student', profile: response.data });
    } else {
      const payload = {
        clerkId,
        name,
        university: university || "Uczelnia wyższa",
        subject: subject || "Inne",
        bio: bio || "Doświadczony korepetytor.",
        pricePerMinute: parseFloat(pricePerMinute) || 1.50,
        imageUrl: imageUrl || `https://i.pravatar.cc/150?img=${Math.floor(Math.random() * 50) + 1}`,
        isOnline: true,
        rating: 5.0,
        reviewsCount: 0
      };
      const response = await flotiqClient.post('/tutor_profile', payload);
      return res.json({ role: 'tutor', profile: response.data });
    }
  } catch (error) {
    console.error('Error creating profile in Flotiq:', error.response?.data || error.message);
    res.status(500).json({ error: 'Failed to create profile' });
  }
});

// 2b. PUT Update User profile (Student or Tutor)
app.put('/api/profile/update', async (req, res) => {
  const { clerkId, name, role, university, subject, pricePerMinute, bio, imageUrl } = req.body;

  if (!clerkId || !name || !role) {
    return res.status(400).json({ error: 'Missing required fields (clerkId, name, role)' });
  }

  try {
    if (role === 'student') {
      // Find student profile to get its Flotiq ID
      const studentFilter = encodeURIComponent(JSON.stringify({ clerkId: { type: 'equals', filter: clerkId } }));
      const checkRes = await flotiqClient.get(`/student_profile?filters=${studentFilter}`);
      const student = checkRes.data.data?.[0];
      if (!student) {
        return res.status(404).json({ error: 'Student profile not found' });
      }

      student.name = name;
      const response = await flotiqClient.put(`/student_profile/${student.id}`, student);
      return res.json({ role: 'student', profile: response.data });
    } else {
      // Find tutor profile
      const tutorFilter = encodeURIComponent(JSON.stringify({ clerkId: { type: 'equals', filter: clerkId } }));
      const checkRes = await flotiqClient.get(`/tutor_profile?filters=${tutorFilter}`);
      const tutor = checkRes.data.data?.[0];
      if (!tutor) {
        return res.status(404).json({ error: 'Tutor profile not found' });
      }

      tutor.name = name;
      tutor.university = university || tutor.university;
      tutor.subject = subject || tutor.subject;
      tutor.bio = bio || tutor.bio;
      tutor.pricePerMinute = parseFloat(pricePerMinute) || tutor.pricePerMinute;
      tutor.imageUrl = imageUrl || tutor.imageUrl;

      const response = await flotiqClient.put(`/tutor_profile/${tutor.id}`, tutor);
      return res.json({ role: 'tutor', profile: response.data });
    }
  } catch (error) {
    console.error('Error updating profile in Flotiq:', error.response?.data || error.message);
    res.status(500).json({ error: 'Failed to update profile' });
  }
});

// 3. GET List online/active Tutors
app.get('/api/tutors', async (req, res) => {
  try {
    const onlineFilter = encodeURIComponent(JSON.stringify({ isOnline: { type: 'equals', filter: true } }));
    const response = await flotiqClient.get(`/tutor_profile?filters=${onlineFilter}`);
    res.json(response.data.data || []);
  } catch (error) {
    console.error('Error fetching tutors from Flotiq:', error.response?.data || error.message);
    res.status(500).json({ error: 'Failed to fetch tutors' });
  }
});

// 4. POST Start session (Create Daily.co room and Session record)
app.post('/api/session/start', async (req, res) => {
  const { studentClerkId, tutorClerkId } = req.body;

  if (!studentClerkId || !tutorClerkId) {
    return res.status(400).json({ error: 'Missing studentClerkId or tutorClerkId' });
  }

  let dailyRoomUrl = '';
  const roomName = `eduminuta_${Date.now()}`;

  // Call Daily.co API to create room
  if (DAILY_API_KEY && DAILY_API_KEY !== 'your_daily_co_api_key_here') {
    try {
      // Try to create room with cloud recording enabled
      const dailyResponse = await axios.post(
        'https://api.daily.co/v1/rooms',
        {
          name: roomName,
          properties: {
            enable_chat: true,
            enable_recording: 'cloud',
            exp: Math.floor(Date.now() / 1000) + 7200, // Expire in 2 hours
          },
        },
        {
          headers: {
            Authorization: `Bearer ${DAILY_API_KEY}`,
            'Content-Type': 'application/json',
          },
        }
      );
      dailyRoomUrl = dailyResponse.data.url;
    } catch (dailyError) {
      console.warn('Daily.co API error with cloud recording, retrying without recording:', dailyError.response?.data || dailyError.message);
      try {
        // Retry without recording (guarantees success on basic free developer accounts)
        const dailyResponse = await axios.post(
          'https://api.daily.co/v1/rooms',
          {
            name: roomName,
            properties: {
              enable_chat: true,
              exp: Math.floor(Date.now() / 1000) + 7200,
            },
          },
          {
            headers: {
              Authorization: `Bearer ${DAILY_API_KEY}`,
              'Content-Type': 'application/json',
            },
          }
        );
        dailyRoomUrl = dailyResponse.data.url;
      } catch (retryError) {
        console.error('Daily.co API fallback error:', retryError.response?.data || retryError.message);
        dailyRoomUrl = `https://meet.jit.si/${roomName}`;
      }
    }
  } else {
    dailyRoomUrl = `https://meet.jit.si/${roomName}`;
  }

  try {
    // Fetch tutor rate to store inside session snapshot
    const tutorFilter = encodeURIComponent(JSON.stringify({ clerkId: { type: 'equals', filter: tutorClerkId } }));
    const tutorRes = await flotiqClient.get(`/tutor_profile?filters=${tutorFilter}`);
    const tutor = tutorRes.data.data[0];

    const payload = {
      studentClerkId,
      tutorClerkId,
      startTime: new Date().toISOString(),
      status: 'active',
      dailyRoomUrl,
      cost: 0,
      durationSeconds: 0
    };
    
    const response = await flotiqClient.post('/tutor_session', payload);
    res.json({ ...response.data, tutorRate: tutor ? tutor.pricePerMinute : 1.50 });
  } catch (error) {
    console.error('Error creating session in Flotiq:', error.response?.data || error.message);
    res.status(500).json({ error: 'Failed to initiate session' });
  }
});

// 5. POST End session (Charge student, record duration, pay tutor)
app.post('/api/session/end', async (req, res) => {
  const { sessionId, durationSeconds } = req.body;

  if (!sessionId || durationSeconds === undefined) {
    return res.status(400).json({ error: 'Missing sessionId or durationSeconds' });
  }

  const endTime = new Date().toISOString();

  try {
    // Fetch active session from Flotiq
    const sessionRes = await flotiqClient.get(`/tutor_session/${sessionId}`);
    const session = sessionRes.data;

    // Fetch tutor rate
    const tutorFilter = encodeURIComponent(JSON.stringify({ clerkId: { type: 'equals', filter: session.tutorClerkId } }));
    const tutorRes = await flotiqClient.get(`/tutor_profile?filters=${tutorFilter}`);
    const tutor = tutorRes.data.data[0];

    const pricePerMinute = tutor ? tutor.pricePerMinute : 1.50;
    const minutes = durationSeconds / 60;
    const cost = parseFloat((minutes * pricePerMinute).toFixed(2));

    // Update Session
    session.status = 'completed';
    session.endTime = endTime;
    session.durationSeconds = durationSeconds;
    session.cost = cost;
    if (session.dailyRoomUrl && !session.dailyRoomUrl.includes('meet.jit.si')) {
      // Mock/Link to Daily cloud recording if Daily API was used
      session.recordingUrl = `https://api.daily.co/v1/recordings/rec_${sessionId}`;
    } else {
      // Fallback
      session.recordingUrl = `https://meet.jit.si/${sessionId}`;
    }
    await flotiqClient.put(`/tutor_session/${sessionId}`, session);

    // Fetch and update Student Wallet
    const studentFilter = encodeURIComponent(JSON.stringify({ clerkId: { type: 'equals', filter: session.studentClerkId } }));
    const studentRes = await flotiqClient.get(`/student_profile?filters=${studentFilter}`);
    const student = studentRes.data.data[0];
    if (student) {
      student.walletBalance = parseFloat((student.walletBalance - cost).toFixed(2));
      await flotiqClient.put(`/student_profile/${student.id}`, student);

      // Record wallet transaction log for Student
      await flotiqClient.post('/wallet_transaction', {
        clerkId: session.studentClerkId,
        amount: -cost,
        type: 'payment',
        timestamp: endTime
      });
    }

    // Record wallet transaction log for Tutor (earnings)
    await flotiqClient.post('/wallet_transaction', {
      clerkId: session.tutorClerkId,
      amount: cost,
      type: 'earnings',
      timestamp: endTime
    });

    res.json({ session, cost });
  } catch (error) {
    console.error('Error ending session in Flotiq:', error.response?.data || error.message);
    res.status(500).json({ error: 'Failed to end session' });
  }
});

// 5b. GET Fetch session detail by sessionId
app.get('/api/session/:sessionId', async (req, res) => {
  const { sessionId } = req.params;
  try {
    const response = await flotiqClient.get(`/tutor_session/${sessionId}`);
    const session = response.data;
    
    // Fetch tutor rate to store inside session snapshot
    const tutorFilter = encodeURIComponent(JSON.stringify({ clerkId: { type: 'equals', filter: session.tutorClerkId } }));
    const tutorRes = await flotiqClient.get(`/tutor_profile?filters=${tutorFilter}`);
    const tutor = tutorRes.data.data[0];
    
    res.json({ ...session, tutorRate: tutor ? tutor.pricePerMinute : 1.50 });
  } catch (error) {
    console.error('Error fetching session details from Flotiq:', error.response?.data || error.message);
    res.status(500).json({ error: 'Failed to fetch session details' });
  }
});

// 6. GET Fetch active incoming/outgoing session for a user
app.get('/api/session/active/:clerkId', async (req, res) => {
  const { clerkId } = req.params;
  try {
    // Check if user is student with active session
    const studentQuery = encodeURIComponent(JSON.stringify({
      studentClerkId: { type: 'equals', filter: clerkId },
      status: { type: 'equals', filter: 'active' }
    }));
    const studentSessionRes = await flotiqClient.get(`/tutor_session?filters=${studentQuery}`);
    if (studentSessionRes.data.data && studentSessionRes.data.data.length > 0) {
      return res.json(studentSessionRes.data.data[0]);
    }

    // Check if user is tutor with active session
    const tutorQuery = encodeURIComponent(JSON.stringify({
      tutorClerkId: { type: 'equals', filter: clerkId },
      status: { type: 'equals', filter: 'active' }
    }));
    const tutorSessionRes = await flotiqClient.get(`/tutor_session?filters=${tutorQuery}`);
    if (tutorSessionRes.data.data && tutorSessionRes.data.data.length > 0) {
      return res.json(tutorSessionRes.data.data[0]);
    }

    return res.status(404).json({ message: 'No active session found' });
  } catch (error) {
    console.error('Error querying active session from Flotiq:', error.response?.data || error.message);
    res.status(500).json({ error: 'Database query failed' });
  }
});

// 7. POST Toggle Tutor online/offline availability status
app.post('/api/profile/status', async (req, res) => {
  const { clerkId, isOnline } = req.body;
  if (!clerkId || isOnline === undefined) {
    return res.status(400).json({ error: 'Missing clerkId or isOnline status' });
  }

  try {
    const tutorFilter = encodeURIComponent(JSON.stringify({ clerkId: { type: 'equals', filter: clerkId } }));
    const tutorRes = await flotiqClient.get(`/tutor_profile?filters=${tutorFilter}`);
    const tutor = tutorRes.data.data[0];

    if (!tutor) {
      return res.status(404).json({ error: 'Tutor profile not found' });
    }

    tutor.isOnline = isOnline;
    const response = await flotiqClient.put(`/tutor_profile/${tutor.id}`, tutor);
    res.json(response.data);
  } catch (error) {
    console.error('Error toggling online status in Flotiq:', error.response?.data || error.message);
    res.status(500).json({ error: 'Failed to toggle status' });
  }
});

// 8. POST Decline session (Reject active call)
app.post('/api/session/decline', async (req, res) => {
  const { sessionId } = req.body;
  if (!sessionId) {
    return res.status(400).json({ error: 'Missing sessionId' });
  }

  try {
    const sessionRes = await flotiqClient.get(`/tutor_session/${sessionId}`);
    const session = sessionRes.data;
    if (session) {
      session.status = 'declined';
      await flotiqClient.put(`/tutor_session/${sessionId}`, session);
      return res.json(session);
    }
    res.status(404).json({ error: 'Session not found' });
  } catch (error) {
    console.error('Error declining session in Flotiq:', error.response?.data || error.message);
    res.status(500).json({ error: 'Failed to decline session' });
  }
});

// 9. POST Add funds to student wallet (BLIK mock/simulate)
app.post('/api/wallet/deposit', async (req, res) => {
  const { clerkId, amount } = req.body;
  if (!clerkId || !amount) {
    return res.status(400).json({ error: 'Missing clerkId or amount' });
  }

  try {
    const studentFilter = encodeURIComponent(JSON.stringify({ clerkId: { type: 'equals', filter: clerkId } }));
    const studentRes = await flotiqClient.get(`/student_profile?filters=${studentFilter}`);
    const student = studentRes.data.data[0];

    if (!student) {
      return res.status(404).json({ error: 'Student profile not found' });
    }

    const currentBalance = parseFloat(student.walletBalance || 0);
    const addedAmount = parseFloat(amount);
    student.walletBalance = parseFloat((currentBalance + addedAmount).toFixed(2));
    
    await flotiqClient.put(`/student_profile/${student.id}`, student);

    // Record wallet transaction
    await flotiqClient.post('/wallet_transaction', {
      clerkId,
      amount: addedAmount,
      type: 'deposit',
      timestamp: new Date().toISOString()
    });

    res.json(student);
  } catch (error) {
    console.error('Error depositing to wallet in Flotiq:', error.response?.data || error.message);
    res.status(500).json({ error: 'Failed to deposit' });
  }
});

// 10. GET Fetch completed session history for a user
app.get('/api/session/history/:clerkId', async (req, res) => {
  const { clerkId } = req.params;
  try {
    // Query completed sessions where user is student
    const studentQuery = encodeURIComponent(JSON.stringify({
      studentClerkId: { type: 'equals', filter: clerkId },
      status: { type: 'equals', filter: 'completed' }
    }));
    const studentRes = await flotiqClient.get(`/tutor_session?filters=${studentQuery}`);
    
    // Query completed sessions where user is tutor
    const tutorQuery = encodeURIComponent(JSON.stringify({
      tutorClerkId: { type: 'equals', filter: clerkId },
      status: { type: 'equals', filter: 'completed' }
    }));
    const tutorRes = await flotiqClient.get(`/tutor_session?filters=${tutorQuery}`);

    const history = [
      ...(studentRes.data.data || []),
      ...(tutorRes.data.data || [])
    ].sort((a, b) => new Date(b.startTime) - new Date(a.startTime));

    res.json(history);
  } catch (error) {
    console.error('Error fetching session history from Flotiq:', error.response?.data || error.message);
    res.status(500).json({ error: 'Failed to fetch session history' });
  }
});

// 10b. POST Submit tutor review & update rating
app.post('/api/tutor/review', async (req, res) => {
  const { tutorClerkId, rating } = req.body;
  if (!tutorClerkId || rating === undefined) {
    return res.status(400).json({ error: 'Missing tutorClerkId or rating' });
  }

  try {
    const tutorFilter = encodeURIComponent(JSON.stringify({ clerkId: { type: 'equals', filter: tutorClerkId } }));
    const tutorRes = await flotiqClient.get(`/tutor_profile?filters=${tutorFilter}`);
    const tutor = tutorRes.data.data[0];

    if (!tutor) {
      return res.status(404).json({ error: 'Tutor profile not found' });
    }

    const currentReviews = parseInt(tutor.reviewsCount || 0);
    const currentRating = parseFloat(tutor.rating || 5.0);

    const newReviews = currentReviews + 1;
    const newRating = parseFloat(((currentRating * currentReviews + parseFloat(rating)) / newReviews).toFixed(1));

    tutor.reviewsCount = newReviews;
    tutor.rating = newRating;

    const response = await flotiqClient.put(`/tutor_profile/${tutor.id}`, tutor);
    res.json(response.data);
  } catch (error) {
    console.error('Error submitting tutor review:', error.response?.data || error.message);
    res.status(500).json({ error: 'Failed to submit review' });
  }
});

// Simple in-memory chat message store
const chatMessages = [
  { id: 'm1', senderId: 'demo_tutor_1', receiverId: 'any_student', text: "Witaj! W czym mogę pomóc? Specjalizuję się w mikroekonomii.", senderRole: 'tutor', timestamp: new Date(Date.now() - 3600000).toISOString() }
];

// 10c. GET Fetch messages between two users
app.get('/api/chat/messages/:userA/:userB', (req, res) => {
  const { userA, userB } = req.params;
  const filtered = chatMessages.filter(
    m => (m.senderId === userA && m.receiverId === userB) ||
         (m.senderId === userB && m.receiverId === userA)
  );
  res.json(filtered);
});

// 10d. GET Fetch all conversations for a user
app.get('/api/chat/conversations/:clerkId', async (req, res) => {
  const { clerkId } = req.params;
  const userMessages = chatMessages.filter(m => m.senderId === clerkId || m.receiverId === clerkId);
  const peerIds = [...new Set(userMessages.map(m => m.senderId === clerkId ? m.receiverId : m.senderId))];
  const conversations = [];
  
  for (const peerId of peerIds) {
    let name = "Marek (Demo)";
    let imageUrl = "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&fit=crop&q=80";
    let role = "student";
    
    try {
      const studentFilter = encodeURIComponent(JSON.stringify({ clerkId: { type: 'equals', filter: peerId } }));
      const studentRes = await flotiqClient.get(`/student_profile?filters=${studentFilter}`);
      if (studentRes.data.data && studentRes.data.data.length > 0) {
        name = studentRes.data.data[0].name;
        role = "student";
      } else {
        const tutorFilter = encodeURIComponent(JSON.stringify({ clerkId: { type: 'equals', filter: peerId } }));
        const tutorRes = await flotiqClient.get(`/tutor_profile?filters=${tutorFilter}`);
        if (tutorRes.data.data && tutorRes.data.data.length > 0) {
          name = tutorRes.data.data[0].name;
          imageUrl = tutorRes.data.data[0].imageUrl;
          role = "tutor";
        }
      }
    } catch (err) {
      console.error("Error looking up peer profile for conversation:", err);
    }
    
    const peerMsgs = userMessages.filter(m => m.senderId === peerId || m.receiverId === peerId);
    const lastMsg = peerMsgs[peerMsgs.length - 1];
    
    conversations.push({
      peerId,
      name,
      imageUrl,
      role,
      lastMessage: lastMsg ? lastMsg.text : "",
      timestamp: lastMsg ? lastMsg.timestamp : new Date().toISOString()
    });
  }
  
  res.json(conversations);
});

// 10e. POST Send message
app.post('/api/chat/send', (req, res) => {
  const { senderId, receiverId, text, senderRole } = req.body;
  if (!senderId || !receiverId || !text) {
    return res.status(400).json({ error: 'Missing required fields' });
  }
  
  const message = {
    id: `msg_${Date.now()}`,
    senderId,
    receiverId,
    text,
    senderRole,
    timestamp: new Date().toISOString()
  };
  
  chatMessages.push(message);
  res.json(message);
});

// 11. POST Seed database with sample tutors for presentation demo
app.post('/api/db/seed', async (req, res) => {
  const sampleTutors = [
    { clerkId: 'demo_tutor_1', name: 'Dr. Jan Kowalski', university: 'SGH w Warszawie', subject: 'Mikroekonomia', bio: 'Wykładowca akademicki z 15-letnim stażem. Tłumaczę trudne koncepcje w prosty, intuicyjny sposób. Specjalizuję się w teorii gier i monopolu.', pricePerMinute: 2.20, imageUrl: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&fit=crop&q=80', isOnline: true, rating: 4.9, reviewsCount: 142 },
    { clerkId: 'demo_tutor_2', name: 'Karolina Wiśniewska', university: 'UE w Krakowie', subject: 'Ekonometria', bio: 'Absolwentka Analityki Gospodarczej. Pomagam w projektach z Gretla, R i Pythona. Testy heteroskedastyczności i autokorelacji nie będą już problemem!', pricePerMinute: 1.80, imageUrl: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&fit=crop&q=80', isOnline: true, rating: 4.8, reviewsCount: 96 },
    { clerkId: 'demo_tutor_3', name: 'Mgr Michał Mazur', university: 'UE we Wrocławiu', subject: 'Rachunkowość', bio: 'Certyfikowany księgowy. Bilans, rachunek zysków i strat, księgowanie operacji gospodarczych. Szybkie powtórki przed kolokwiami.', pricePerMinute: 1.90, imageUrl: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&fit=crop&q=80', isOnline: true, rating: 5.0, reviewsCount: 78 },
    { clerkId: 'demo_tutor_4', name: 'Anna Wójcik', university: 'Uniwersytet Warszawski', subject: 'Statystyka', bio: 'Studentka ostatniego roku matematyki finansowej. Prawdopodobieństwo, testy hipotez statystycznych, przedziały ufności.', pricePerMinute: 1.50, imageUrl: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150&fit=crop&q=80', isOnline: true, rating: 4.7, reviewsCount: 112 },
    { clerkId: 'demo_tutor_5', name: 'Tomasz Lewandowski', university: 'Akademia Leona Koźmińskiego', subject: 'Finanse', bio: 'Praktyk rynków finansowych, analityk w funduszu inwestycyjnym. Pomagam w wycenie instrumentów, analizie wskaźnikowej i corporate finance.', pricePerMinute: 2.50, imageUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&fit=crop&q=80', isOnline: true, rating: 4.9, reviewsCount: 54 }
  ];

  try {
    const createdTutors = [];
    for (const tutor of sampleTutors) {
      // Check if tutor already exists
      const filter = encodeURIComponent(JSON.stringify({ clerkId: { type: 'equals', filter: tutor.clerkId } }));
      const checkRes = await flotiqClient.get(`/tutor_profile?filters=${filter}`);
      
      if (checkRes.data.data && checkRes.data.data.length > 0) {
        // Already exists, skip
        continue;
      }
      
      // Create profile
      const response = await flotiqClient.post('/tutor_profile', tutor);
      createdTutors.push(response.data);
    }
    res.json({ message: `Successfully seeded ${createdTutors.length} sample tutors.`, tutors: createdTutors });
  } catch (error) {
    console.error('Error seeding database:', error.response?.data || error.message);
    res.status(500).json({ error: 'Failed to seed database' });
  }
});

// 12. GET Debug Daily.co configuration
app.get('/api/debug/daily', async (req, res) => {
  const keyStatus = {
    exists: !!DAILY_API_KEY,
    isPlaceholder: DAILY_API_KEY === 'your_daily_co_api_key_here',
    keyLength: DAILY_API_KEY ? DAILY_API_KEY.length : 0
  };

  if (!DAILY_API_KEY || keyStatus.isPlaceholder) {
    return res.json({
      status: 'error',
      message: 'Daily.co API key is not configured or is set to placeholder in environment variables.',
      keyStatus
    });
  }

  const roomName = `eduminuta_debug_${Date.now()}`;
  try {
    const dailyResponse = await axios.post(
      'https://api.daily.co/v1/rooms',
      {
        name: roomName,
        properties: {
          enable_chat: true,
          exp: Math.floor(Date.now() / 1000) + 900, // 15 mins
        },
      },
      {
        headers: {
          Authorization: `Bearer ${DAILY_API_KEY}`,
          'Content-Type': 'application/json',
        },
      }
    );
    return res.json({
      status: 'success',
      message: 'Daily.co room created successfully!',
      roomUrl: dailyResponse.data.url,
      keyStatus
    });
  } catch (error) {
    return res.status(500).json({
      status: 'error',
      message: 'Failed to create Daily.co room.',
      error: error.response?.data || error.message,
      keyStatus
    });
  }
});

const server = app.listen(PORT, () => {
  console.log(`🚀 EduMinuta Live Backend Server running on port ${PORT}`);
});

// Setup WebSocket Server for drawing synchronization fallback
const wss = new WebSocketServer({ noServer: true });
const rooms = new Map();

server.on('upgrade', (request, socket, head) => {
  const url = new URL(request.url, 'http://localhost');
  if (url.pathname === '/api/sync') {
    wss.handleUpgrade(request, socket, head, (ws) => {
      wss.emit('connection', ws, request);
    });
  } else {
    socket.destroy();
  }
});

wss.on('connection', (ws, request) => {
  const url = new URL(request.url, 'http://localhost');
  const roomId = url.searchParams.get('roomId');

  if (!roomId) {
    ws.close();
    return;
  }

  if (!rooms.has(roomId)) {
    rooms.set(roomId, new Set());
  }
  rooms.get(roomId).add(ws);

  ws.on('message', (message) => {
    const clients = rooms.get(roomId);
    if (!clients) return;
    for (const client of clients) {
      if (client !== ws && client.readyState === 1) { // 1 = OPEN
        client.send(message.toString());
      }
    }
  });

  ws.on('close', () => {
    const clients = rooms.get(roomId);
    if (clients) {
      clients.delete(ws);
      if (clients.size === 0) {
        rooms.delete(roomId);
      }
    }
  });
});
