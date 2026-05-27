import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import axios from 'axios';
import path from 'path';
import { fileURLToPath } from 'url';

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

if (!DAILY_API_KEY || DAILY_API_KEY === 'your_daily_co_api_key_here') {
  console.warn('⚠️ Ostrzeżenie: Brak klucza DAILY_API_KEY. Video call pokoje będą miały fallback na Jitsi Meet.');
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
      console.error('Daily.co API error:', dailyError.response?.data || dailyError.message);
      dailyRoomUrl = `https://meet.jit.si/${roomName}`;
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
      durationSeconds: 0,
      tutorRate: tutor ? tutor.pricePerMinute : 1.50
    };
    
    const response = await flotiqClient.post('/tutor_session', payload);
    res.json({ ...response.data, tutorRate: payload.tutorRate });
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

app.listen(PORT, () => {
  console.log(`🚀 EduMinuta Live Backend Server running on port ${PORT}`);
});
