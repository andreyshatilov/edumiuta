import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import axios from 'axios';
import path from 'path';
import { fileURLToPath } from 'url';
import { WebSocketServer } from 'ws';
import fs from 'fs';
import multer from 'multer';

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

const rooms = new Map();

// Setup file upload configurations
const uploadDir = path.join(__dirname, 'public', 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Serve uploaded files statically
app.use('/uploads', express.static(uploadDir));

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});
const upload = multer({ storage });

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
            .filter(t => t.type === 'earnings' || t.type === 'payout')
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
  const { clerkId, name, role, university, subject, pricePerMinute, bio, imageUrl, linkedin, videoGreetingUrl, certificates, experience } = req.body;

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
        bio: bio || "Doświadczony korepetytor z indywidualnym podejściem do każdego ucznia.",
        pricePerMinute: parseFloat(pricePerMinute) || 1.50,
        imageUrl: imageUrl || `https://i.pravatar.cc/150?img=${Math.floor(Math.random() * 50) + 1}`,
        isOnline: true,
        rating: 5.0,
        reviewsCount: 0,
        linkedin: linkedin || "",
        videoGreetingUrl: videoGreetingUrl || "",
        certificates: certificates || "Certyfikat ukończenia studiów kierunkowych",
        experience: experience || "Brak podanego doświadczenia"
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
  const { clerkId, name, role, university, subject, pricePerMinute, bio, imageUrl, linkedin, videoGreetingUrl, certificates, experience, availableSlots } = req.body;

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
      tutor.linkedin = linkedin !== undefined ? linkedin : (tutor.linkedin || "");
      tutor.videoGreetingUrl = videoGreetingUrl !== undefined ? videoGreetingUrl : (tutor.videoGreetingUrl || "");
      tutor.certificates = certificates !== undefined ? certificates : (tutor.certificates || "");
      tutor.experience = experience !== undefined ? experience : (tutor.experience || "");
      tutor.availableSlots = availableSlots !== undefined ? availableSlots : (tutor.availableSlots || "{}");

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

// 4. POST Start session request (Create session with 'requested' status)
app.post('/api/session/start', async (req, res) => {
  const { studentClerkId, tutorClerkId, studentName, subject, approximateTime, taskDescription } = req.body;

  if (!studentClerkId || !tutorClerkId) {
    return res.status(400).json({ error: 'Missing studentClerkId or tutorClerkId' });
  }

  try {
    // Fetch tutor rate to store inside session snapshot
    const tutorFilter = encodeURIComponent(JSON.stringify({ clerkId: { type: 'equals', filter: tutorClerkId } }));
    const tutorRes = await flotiqClient.get(`/tutor_profile?filters=${tutorFilter}`);
    const tutor = tutorRes.data.data?.[0];

    const pricePerMinute = tutor ? tutor.pricePerMinute : 1.50;

    // Sanitize student name (RODO) - only first name!
    const sanitizedStudentName = studentName ? studentName.split(' ')[0] : 'Uczeń';

    const payload = {
      studentClerkId,
      tutorClerkId,
      studentName: sanitizedStudentName,
      subject: subject || (tutor ? tutor.subject : "Inne"),
      approximateTime: approximateTime || "30 min",
      taskDescription: taskDescription || "",
      tutorRate: pricePerMinute,
      startTime: new Date().toISOString(), // Request timestamp
      status: 'requested',
      dailyRoomUrl: '',
      recordingUrl: '',
      cost: 0,
      durationSeconds: 0
    };
    
    const response = await flotiqClient.post('/tutor_session', payload);
    
    // Trigger Notification to Tutor
    await createAndSendNotification(
      tutorClerkId,
      'Prośba o szybką lekcję! 📞',
      `Student ${sanitizedStudentName} prosi o lekcję z przedmiotu: ${subject || "Inne"} (${approximateTime}).`,
      'live_call_request'
    );

    res.json({ ...response.data, tutorRate: pricePerMinute });
  } catch (error) {
    console.error('Error creating session request in Flotiq:', error.response?.data || error.message);
    res.status(500).json({ error: 'Failed to request session' });
  }
});

// 4b. POST Accept session request (Provision Daily.co room and activate session)
app.post('/api/session/accept', async (req, res) => {
  const { sessionId } = req.body;

  if (!sessionId) {
    return res.status(400).json({ error: 'Missing sessionId' });
  }

  try {
    // Fetch requested session from Flotiq
    const sessionRes = await flotiqClient.get(`/tutor_session/${sessionId}`);
    const session = sessionRes.data;

    if (!session || session.status !== 'requested') {
      return res.status(400).json({ error: 'Session is not in requested state or not found' });
    }

    let dailyRoomUrl = '';
    const roomName = `studybuddy_${Date.now()}`;

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
        console.warn('Daily.co API error with cloud recording, retrying without recording:', dailyError.message);
        try {
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
          dailyRoomUrl = `https://meet.jit.si/${roomName}`;
        }
      }
    } else {
      dailyRoomUrl = `https://meet.jit.si/${roomName}`;
    }

    // Update Session: set start time to now, status to active, and save room URL
    session.status = 'active';
    session.startTime = new Date().toISOString();
    session.dailyRoomUrl = dailyRoomUrl;

    const response = await flotiqClient.put(`/tutor_session/${sessionId}`, session);
    res.json(response.data);
  } catch (error) {
    console.error('Error accepting session request in Flotiq:', error.response?.data || error.message);
    res.status(500).json({ error: 'Failed to accept session' });
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

    // Use specific tutorRate stored on the session snapshot to avoid standard fallbacks!
    const pricePerMinute = parseFloat(session.tutorRate || 1.50);
    const minutes = durationSeconds / 60;
    const cost = parseFloat((minutes * pricePerMinute).toFixed(2));

    // Update Session
    session.status = 'completed';
    session.endTime = endTime;
    session.durationSeconds = durationSeconds;
    session.cost = cost;
    if (session.dailyRoomUrl && !session.dailyRoomUrl.includes('meet.jit.si')) {
      session.recordingUrl = `https://api.daily.co/v1/recordings/rec_${sessionId}`;
    } else {
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
    
    // Explicitly return the stored tutorRate
    res.json({ ...session, tutorRate: parseFloat(session.tutorRate || 1.50) });
  } catch (error) {
    console.error('Error fetching session details from Flotiq:', error.response?.data || error.message);
    res.status(500).json({ error: 'Failed to fetch session details' });
  }
});

// 6. GET Fetch active incoming/outgoing session/request for a user
app.get('/api/session/active/:clerkId', async (req, res) => {
  const { clerkId } = req.params;
  try {
    // Check if user is student with active session
    const studentQueryActive = encodeURIComponent(JSON.stringify({
      studentClerkId: { type: 'equals', filter: clerkId },
      status: { type: 'equals', filter: 'active' }
    }));
    const studentActiveRes = await flotiqClient.get(`/tutor_session?filters=${studentQueryActive}`);
    if (studentActiveRes.data.data && studentActiveRes.data.data.length > 0) {
      return res.json({ ...studentActiveRes.data.data[0], tutorRate: parseFloat(studentActiveRes.data.data[0].tutorRate || 1.50) });
    }

    // Check if user is student with pending requested session
    const studentQueryReq = encodeURIComponent(JSON.stringify({
      studentClerkId: { type: 'equals', filter: clerkId },
      status: { type: 'equals', filter: 'requested' }
    }));
    const studentReqRes = await flotiqClient.get(`/tutor_session?filters=${studentQueryReq}`);
    if (studentReqRes.data.data && studentReqRes.data.data.length > 0) {
      return res.json({ ...studentReqRes.data.data[0], tutorRate: parseFloat(studentReqRes.data.data[0].tutorRate || 1.50) });
    }

    // Check if user is tutor with active session
    const tutorQueryActive = encodeURIComponent(JSON.stringify({
      tutorClerkId: { type: 'equals', filter: clerkId },
      status: { type: 'equals', filter: 'active' }
    }));
    const tutorActiveRes = await flotiqClient.get(`/tutor_session?filters=${tutorQueryActive}`);
    if (tutorActiveRes.data.data && tutorActiveRes.data.data.length > 0) {
      return res.json({ ...tutorActiveRes.data.data[0], tutorRate: parseFloat(tutorActiveRes.data.data[0].tutorRate || 1.50) });
    }

    // Check if user is tutor with pending requested session
    const tutorQueryReq = encodeURIComponent(JSON.stringify({
      tutorClerkId: { type: 'equals', filter: clerkId },
      status: { type: 'equals', filter: 'requested' }
    }));
    const tutorReqRes = await flotiqClient.get(`/tutor_session?filters=${tutorQueryReq}`);
    if (tutorReqRes.data.data && tutorReqRes.data.data.length > 0) {
      return res.json({ ...tutorReqRes.data.data[0], tutorRate: parseFloat(tutorReqRes.data.data[0].tutorRate || 1.50) });
    }

    return res.status(404).json({ message: 'No active session or request found' });
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

// 8. POST Decline session request (Reject request)
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

// 8b. POST Cancel session request (Student cancels)
app.post('/api/session/cancel', async (req, res) => {
  const { sessionId } = req.body;
  if (!sessionId) {
    return res.status(400).json({ error: 'Missing sessionId' });
  }

  try {
    const sessionRes = await flotiqClient.get(`/tutor_session/${sessionId}`);
    const session = sessionRes.data;
    if (session) {
      session.status = 'canceled';
      await flotiqClient.put(`/tutor_session/${sessionId}`, session);
      return res.json(session);
    }
    res.status(404).json({ error: 'Session not found' });
  } catch (error) {
    console.error('Error canceling session in Flotiq:', error.response?.data || error.message);
    res.status(500).json({ error: 'Failed to cancel session' });
  }
});

// 8c. POST Subscribe to newsletter
app.post('/api/newsletter/subscribe', async (req, res) => {
  const { email } = req.body;
  if (!email) {
    return res.status(400).json({ error: 'Missing email' });
  }

  try {
    const payload = {
      email,
      timestamp: new Date().toISOString()
    };
    const response = await flotiqClient.post('/newsletter_subscriber', payload);
    res.json({ success: true, message: 'Subscribed successfully!', data: response.data });
  } catch (error) {
    console.error('Error subscribing email to Flotiq:', error.response?.data || error.message);
    if (error.response?.data?.errors?.[0]?.message?.includes('unique') || error.response?.data?.errors?.[0]?.message?.includes('duplicate')) {
      return res.json({ success: true, message: 'Twój email jest już zapisany w naszym newsletterze!' });
    }
    res.status(500).json({ error: 'Failed to subscribe' });
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
    { 
      clerkId: 'demo_tutor_1', 
      name: 'Dr. Jan Kowalski', 
      university: 'SGH w Warszawie', 
      subject: 'Mikroekonomia', 
      bio: 'Wykładowca akademicki z 15-letnim stażem. Tłumaczę trudne koncepcje w prosty, intuicyjny sposób. Specjalizuję się w teorii gier i analizie rynków oligopolistycznych.', 
      pricePerMinute: 2.20, 
      imageUrl: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&fit=crop&q=80', 
      isOnline: true, 
      rating: 4.9, 
      reviewsCount: 142,
      linkedin: 'https://linkedin.com/in/jankowalski-demo',
      videoGreetingUrl: 'https://www.youtube.com/embed/dQw4w9WgXcQ',
      certificates: 'Doktor nauk ekonomicznych SGH, Certyfikat Tutora Akademickiego, Najlepszy Dydaktyk Roku 2024',
      experience: '15 lat prowadzenia zajęć z teorii gier i mikroekonomii na SGH, 10 lat indywidualnego mentoringu'
    },
    { 
      clerkId: 'demo_tutor_2', 
      name: 'Karolina Wiśniewska', 
      university: 'UE w Krakowie', 
      subject: 'Ekonometria', 
      bio: 'Absolwentka Analityki Gospodarczej. Pomagam w projektach z Gretla, R i Pythona. Testy heteroskedastyczności i autokorelacji nie będą już problemem! Pracuję na żywych bazach danych.', 
      pricePerMinute: 1.80, 
      imageUrl: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&fit=crop&q=80', 
      isOnline: true, 
      rating: 4.8, 
      reviewsCount: 96,
      linkedin: 'https://linkedin.com/in/karolinawisniewska-demo',
      videoGreetingUrl: 'https://www.youtube.com/embed/dQw4w9WgXcQ',
      certificates: 'Magister Ekonometrii UEK, Certyfikat Data Analyst Professional (Python/R)',
      experience: '3 lata pracy jako Data Scientist, ponad 200 godzin zrealizowanych lekcji z ekonometrii'
    },
    { 
      clerkId: 'demo_tutor_3', 
      name: 'Mgr Michał Mazur', 
      university: 'UE we Wrocławiu', 
      subject: 'Rachunkowość', 
      bio: 'Certyfikowany księgowy. Bilans, rachunek zysków i strat, księgowanie operacji gospodarczych. Szybkie powtórki przed kolokwiami i egzaminami ACCA.', 
      pricePerMinute: 1.95, 
      imageUrl: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&fit=crop&q=80', 
      isOnline: true, 
      rating: 5.0, 
      reviewsCount: 78,
      linkedin: 'https://linkedin.com/in/michalmazur-demo',
      videoGreetingUrl: 'https://www.youtube.com/embed/dQw4w9WgXcQ',
      certificates: 'Certyfikat Ministra Finansów do usługowego prowadzenia ksiąg rachunkowych, ACCA Advanced Diploma',
      experience: 'Senior Auditor w firmie z Wielkiej Czwórki, 4 lata nauczania rachunkowości finansowej i zarządej'
    },
    { 
      clerkId: 'demo_tutor_4', 
      name: 'Anna Wójcik', 
      university: 'Uniwersytet Warszawski', 
      subject: 'Statystyka', 
      bio: 'Studentka ostatniego roku matematyki finansowej na UW. Prawdopodobieństwo, testy hipotez statystycznych, przedziały ufności. Tłumaczę statystykę „na chłopski rozum”.', 
      pricePerMinute: 1.45, 
      imageUrl: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150&fit=crop&q=80', 
      isOnline: true, 
      rating: 4.7, 
      reviewsCount: 112,
      linkedin: 'https://linkedin.com/in/annawojcik-demo',
      videoGreetingUrl: 'https://www.youtube.com/embed/dQw4w9WgXcQ',
      certificates: 'Laureatka Olimpiady Matematycznej, Stypendystka Rektora UW za wyniki w nauce',
      experience: '2 lata intensywnego udzielania korepetycji dla studentów kierunków ekonomicznych i humanistycznych'
    },
    { 
      clerkId: 'demo_tutor_5', 
      name: 'Tomasz Lewandowski', 
      university: 'Akademia Leona Koźmińskiego', 
      subject: 'Finanse', 
      bio: 'Praktyk rynków finansowych, analityk w funduszu inwestycyjnym. Pomagam w wycenie instrumentów, analizie wskaźnikowej, corporate finance i wycenach DCF.', 
      pricePerMinute: 2.50, 
      imageUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&fit=crop&q=80', 
      isOnline: true, 
      rating: 4.9, 
      reviewsCount: 54,
      linkedin: 'https://linkedin.com/in/tomaszlewandowski-demo',
      videoGreetingUrl: 'https://www.youtube.com/embed/dQw4w9WgXcQ',
      certificates: 'CFA Candidate (Level II passed), Licencja Doradcy Inwestycyjnego nr 12345',
      experience: '3 lata jako Młodszy Portfolio Manager w TFI, 2 lata nauczania wyceny przedsiębiorstw i corporate finance'
    }
  ];

  try {
    const createdTutors = [];
    for (const tutor of sampleTutors) {
      // Check if tutor already exists
      const filter = encodeURIComponent(JSON.stringify({ clerkId: { type: 'equals', filter: tutor.clerkId } }));
      const checkRes = await flotiqClient.get(`/tutor_profile?filters=${filter}`);
      
      if (checkRes.data.data && checkRes.data.data.length > 0) {
        // Update details if already exists (seeds LinkedIn, certificates, experience etc.)
        const existing = checkRes.data.data[0];
        const updated = { ...existing, ...tutor };
        await flotiqClient.put(`/tutor_profile/${existing.id}`, updated);
        createdTutors.push(updated);
        continue;
      }
      
      // Create profile
      const response = await flotiqClient.post('/tutor_profile', tutor);
      createdTutors.push(response.data);
    }
    res.json({ message: `Successfully seeded/updated ${createdTutors.length} sample tutors.`, tutors: createdTutors });
  } catch (error) {
    console.error('Error seeding database:', error.response?.data || error.message);
    res.status(500).json({ error: 'Failed to seed database' });
  }
});

// --- NEW BOOKING, PAYOUT, & UPLOADS ENDPOINTS ---

// Helper to create and broadcast system notifications
async function createAndSendNotification(clerkId, title, message, type) {
  try {
    const payload = {
      clerkId,
      title,
      message,
      type,
      read: false,
      timestamp: new Date().toISOString()
    };
    
    // Save to Flotiq
    const response = await flotiqClient.post('/system_notification', payload);
    const savedNotification = response.data;
    
    // Broadcast via WebSockets room notifications_${clerkId}
    const clients = rooms.get(`notifications_${clerkId}`);
    if (clients) {
      const socketPayload = JSON.stringify({
        type: 'notification',
        data: savedNotification
      });
      for (const client of clients) {
        if (client.readyState === 1) { // 1 = OPEN
          client.send(socketPayload);
        }
      }
    }
    
    return savedNotification;
  } catch (err) {
    console.error("Error creating/sending system notification:", err.response?.data || err.message);
  }
}

// Get user notifications
app.get('/api/notifications/:clerkId', async (req, res) => {
  const { clerkId } = req.params;
  try {
    const filter = encodeURIComponent(JSON.stringify({ clerkId: { type: 'equals', filter: clerkId } }));
    const response = await flotiqClient.get(`/system_notification?filters=${filter}`);
    const notifications = (response.data.data || []).sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    res.json(notifications);
  } catch (error) {
    console.error('Error fetching notifications:', error.response?.data || error.message);
    res.status(500).json({ error: 'Nie udało się pobrać powiadomień' });
  }
});

// Mark a notification as read
app.post('/api/notifications/read/:notificationId', async (req, res) => {
  const { notificationId } = req.params;
  try {
    const response = await flotiqClient.get(`/system_notification/${notificationId}`);
    const notification = response.data;
    if (notification) {
      notification.read = true;
      const updated = await flotiqClient.put(`/system_notification/${notificationId}`, notification);
      return res.json(updated.data);
    }
    res.status(404).json({ error: 'Powiadomienie nie zostało znalezione' });
  } catch (error) {
    console.error('Error marking notification as read:', error.response?.data || error.message);
    res.status(500).json({ error: 'Nie udało się zaktualizować powiadomienia' });
  }
});

// Mark all user notifications as read
app.post('/api/notifications/read-all/:clerkId', async (req, res) => {
  const { clerkId } = req.params;
  try {
    const filter = encodeURIComponent(JSON.stringify({
      clerkId: { type: 'equals', filter: clerkId },
      read: { type: 'equals', filter: false }
    }));
    const response = await flotiqClient.get(`/system_notification?filters=${filter}`);
    const unreadNotifications = response.data.data || [];
    
    const updatedNotifications = [];
    for (const notif of unreadNotifications) {
      notif.read = true;
      const updated = await flotiqClient.put(`/system_notification/${notif.id}`, notif);
      updatedNotifications.push(updated.data);
    }
    
    res.json({ success: true, count: updatedNotifications.length });
  } catch (error) {
    console.error('Error marking all notifications as read:', error.response?.data || error.message);
    res.status(500).json({ error: 'Nie udało się zaktualizować powiadomień' });
  }
});

// Get wallet transaction history
app.get('/api/transactions/:clerkId', async (req, res) => {
  const { clerkId } = req.params;
  try {
    const filter = encodeURIComponent(JSON.stringify({
      clerkId: { type: 'equals', filter: clerkId }
    }));
    const response = await flotiqClient.get(`/wallet_transaction?filters=${filter}`);
    const transactions = (response.data.data || []).sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    res.json(transactions);
  } catch (error) {
    console.error('Error fetching transactions:', error.response?.data || error.message);
    res.status(500).json({ error: 'Nie udało się pobrać historii portfela' });
  }
});

// Create a tutor review and update tutor average rating
app.post('/api/reviews', async (req, res) => {
  const { studentClerkId, studentName, tutorClerkId, sessionId, rating, comment } = req.body;
  try {
    // 1. Create the review record
    const timestamp = new Date().toISOString();
    const payload = {
      studentClerkId,
      studentName: studentName || 'Anonimowy Uczeń',
      tutorClerkId,
      sessionId,
      rating: Number(rating),
      comment: comment || '',
      timestamp
    };
    const reviewResponse = await flotiqClient.post('/tutor_review', payload);
    const savedReview = reviewResponse.data;

    // 2. Fetch all reviews for this tutor to recalculate average score
    const filter = encodeURIComponent(JSON.stringify({
      tutorClerkId: { type: 'equals', filter: tutorClerkId }
    }));
    const allReviewsResponse = await flotiqClient.get(`/tutor_review?filters=${filter}`);
    const reviewsList = allReviewsResponse.data.data || [];
    
    const count = reviewsList.length;
    const sum = reviewsList.reduce((acc, r) => acc + (Number(r.rating) || 0), 0);
    const averageRating = count > 0 ? Number((sum / count).toFixed(2)) : 5.0;

    // 3. Update the tutor's profile with new rating metrics
    // First fetch current profile data to not lose required fields
    const tutorFilter = encodeURIComponent(JSON.stringify({ clerkId: { type: 'equals', filter: tutorClerkId } }));
    const tutorProfileResponse = await flotiqClient.get(`/tutor_profile?filters=${tutorFilter}`);
    const tutorProfiles = tutorProfileResponse.data.data || [];
    if (tutorProfiles.length > 0) {
      const profile = tutorProfiles[0];
      profile.rating = averageRating;
      profile.reviewsCount = count;
      await flotiqClient.put(`/tutor_profile/${profile.id}`, profile);
    }

    res.json({ success: true, review: savedReview, averageRating, reviewsCount: count });
  } catch (error) {
    console.error('Error creating tutor review:', error.response?.data || error.message);
    res.status(500).json({ error: 'Nie udało się dodać opinii' });
  }
});

// Get reviews for a specific tutor
app.get('/api/tutors/:tutorClerkId/reviews', async (req, res) => {
  const { tutorClerkId } = req.params;
  try {
    const filter = encodeURIComponent(JSON.stringify({
      tutorClerkId: { type: 'equals', filter: tutorClerkId }
    }));
    const response = await flotiqClient.get(`/tutor_review?filters=${filter}`);
    const reviews = (response.data.data || []).sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    res.json(reviews);
  } catch (error) {
    console.error('Error fetching tutor reviews:', error.response?.data || error.message);
    res.status(500).json({ error: 'Nie udało się pobrać opinii' });
  }
});

// Get reviews submitted by a student
app.get('/api/reviews/student/:studentClerkId', async (req, res) => {
  const { studentClerkId } = req.params;
  try {
    const filter = encodeURIComponent(JSON.stringify({
      studentClerkId: { type: 'equals', filter: studentClerkId }
    }));
    const response = await flotiqClient.get(`/tutor_review?filters=${filter}`);
    res.json(response.data.data || []);
  } catch (error) {
    console.error('Error fetching student reviews:', error.response?.data || error.message);
    res.status(500).json({ error: 'Nie udało się pobrać Twoich opinii' });
  }
});

// Whiteboard Background Image Upload
app.post('/api/whiteboard/upload', upload.single('file'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'Brak pliku w żądaniu' });
  }
  const fileUrl = `/uploads/${req.file.filename}`;
  res.json({ url: fileUrl });
});

// Chat Attachment Upload
app.post('/api/chat/upload', upload.single('file'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'Brak pliku w żądaniu' });
  }
  const fileUrl = `/uploads/${req.file.filename}`;
  res.json({
    url: fileUrl,
    filename: req.file.originalname,
    mimetype: req.file.mimetype,
    size: req.file.size
  });
});

// Request Payout
app.post('/api/payout/request', async (req, res) => {
  const { tutorClerkId, amount, iban } = req.body;
  if (!tutorClerkId || !amount || !iban) {
    return res.status(400).json({ error: 'Brakujące wymagane pola (tutorClerkId, amount, iban)' });
  }

  try {
    // Fetch tutor profile
    const tutorFilter = encodeURIComponent(JSON.stringify({ clerkId: { type: 'equals', filter: tutorClerkId } }));
    const tutorRes = await flotiqClient.get(`/tutor_profile?filters=${tutorFilter}`);
    const tutor = tutorRes.data.data?.[0];
    if (!tutor) {
      return res.status(404).json({ error: 'Tutor nie został znaleziony' });
    }

    // Save IBAN to tutor profile if new
    if (iban && tutor.iban !== iban) {
      tutor.iban = iban;
      await flotiqClient.put(`/tutor_profile/${tutor.id}`, tutor);
    }

    // Check balance
    const transFilter = encodeURIComponent(JSON.stringify({ clerkId: { type: 'equals', filter: tutorClerkId } }));
    const transRes = await flotiqClient.get(`/wallet_transaction?filters=${transFilter}`);
    let balance = 0.00;
    if (transRes.data.data) {
      balance = transRes.data.data
        .filter(t => t.type === 'earnings' || t.type === 'payout')
        .reduce((sum, t) => sum + parseFloat(t.amount || 0), 0);
    }

    const payoutAmount = parseFloat(amount);
    if (balance < payoutAmount) {
      return res.status(400).json({ error: 'Niewystarczające środki na koncie do wypłaty.' });
    }

    // Create payout request
    const payoutReqPayload = {
      tutorClerkId,
      amount: payoutAmount,
      iban,
      status: 'pending',
      timestamp: new Date().toISOString()
    };
    const response = await flotiqClient.post('/payout_request', payoutReqPayload);

    // Record wallet transaction (negative amount)
    await flotiqClient.post('/wallet_transaction', {
      clerkId: tutorClerkId,
      amount: -payoutAmount,
      type: 'payout',
      timestamp: new Date().toISOString()
    });

    // Trigger Payout Notification to Tutor
    await createAndSendNotification(
      tutorClerkId,
      'Zlecono wypłatę środków 💰',
      `Złożono wniosek o wypłatę ${payoutAmount.toFixed(2)} PLN na konto IBAN: ...${iban.slice(-6)}.`,
      'payout_status'
    );

    res.json(response.data);
  } catch (error) {
    console.error('Error requesting payout:', error.response?.data || error.message);
    res.status(500).json({ error: 'Nie udało się przetworzyć wypłaty' });
  }
});

// Get Payout History
app.get('/api/payout/history/:clerkId', async (req, res) => {
  const { clerkId } = req.params;
  try {
    const filter = encodeURIComponent(JSON.stringify({ tutorClerkId: { type: 'equals', filter: clerkId } }));
    const response = await flotiqClient.get(`/payout_request?filters=${filter}`);
    const history = (response.data.data || []).sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    res.json(history);
  } catch (error) {
    console.error('Error fetching payout history:', error.response?.data || error.message);
    res.status(500).json({ error: 'Nie udało się pobrać historii wypłat' });
  }
});

// Request Booking
app.post('/api/booking/request', async (req, res) => {
  const { studentClerkId, tutorClerkId, studentName, subject, approximateTime, taskDescription, bookingDate, bookingTimeSlot } = req.body;

  if (!studentClerkId || !tutorClerkId || !bookingDate || !bookingTimeSlot) {
    return res.status(400).json({ error: 'Brakujące wymagane pola rezerwacji' });
  }

  try {
    // Fetch tutor profile
    const tutorFilter = encodeURIComponent(JSON.stringify({ clerkId: { type: 'equals', filter: tutorClerkId } }));
    const tutorRes = await flotiqClient.get(`/tutor_profile?filters=${tutorFilter}`);
    const tutor = tutorRes.data.data?.[0];
    if (!tutor) {
      return res.status(404).json({ error: 'Tutor nie został znaleziony' });
    }

    const pricePerMinute = tutor.pricePerMinute || 1.50;

    // Fetch student profile to check balance
    const studentFilter = encodeURIComponent(JSON.stringify({ clerkId: { type: 'equals', filter: studentClerkId } }));
    const studentRes = await flotiqClient.get(`/student_profile?filters=${studentFilter}`);
    const student = studentRes.data.data?.[0];
    if (!student) {
      return res.status(404).json({ error: 'Student nie został znaleziony' });
    }

    const minutes = parseInt(approximateTime) || 30;
    const estimatedCost = minutes * pricePerMinute;
    if (parseFloat(student.walletBalance) < estimatedCost) {
      return res.status(400).json({ error: `Niewystarczające środki w portfelu. Szacowany koszt lekcji to ${estimatedCost.toFixed(2)} PLN, twój stan konta: ${parseFloat(student.walletBalance).toFixed(2)} PLN.` });
    }

    const sanitizedStudentName = studentName ? studentName.split(' ')[0] : 'Uczeń';

    const payload = {
      studentClerkId,
      tutorClerkId,
      studentName: sanitizedStudentName,
      subject: subject || tutor.subject,
      approximateTime: approximateTime || "30 min",
      taskDescription: taskDescription || "",
      tutorRate: pricePerMinute,
      startTime: new Date().toISOString(), // booking requested time
      status: 'pending_booking',
      bookingDate,
      bookingTimeSlot,
      dailyRoomUrl: '',
      recordingUrl: '',
      cost: 0,
      durationSeconds: 0
    };

    const response = await flotiqClient.post('/tutor_session', payload);

    // Trigger Notification to Tutor
    await createAndSendNotification(
      tutorClerkId,
      'Nowa prośba o rezerwację terminu 📅',
      `Student ${sanitizedStudentName} prosi o rezerwację: ${bookingDate} o ${bookingTimeSlot} (${approximateTime}).`,
      'booking_request'
    );

    res.json(response.data);
  } catch (error) {
    console.error('Error requesting booking:', error.response?.data || error.message);
    res.status(500).json({ error: 'Nie udało się zarezerwować terminu' });
  }
});

// Accept Booking
app.post('/api/booking/accept', async (req, res) => {
  const { sessionId } = req.body;
  if (!sessionId) {
    return res.status(400).json({ error: 'Brak sessionId' });
  }

  try {
    const sessionRes = await flotiqClient.get(`/tutor_session/${sessionId}`);
    const session = sessionRes.data;
    if (!session || session.status !== 'pending_booking') {
      return res.status(400).json({ error: 'Rezerwacja nie jest w stanie oczekiwania lub nie istnieje' });
    }

    session.status = 'scheduled';
    const response = await flotiqClient.put(`/tutor_session/${sessionId}`, session);

    // Trigger Notification to Student
    await createAndSendNotification(
      session.studentClerkId,
      'Rezerwacja lekcji została zaakceptowana! 🎉',
      `Korepetytor zaakceptował rezerwację na dzień ${session.bookingDate} o godzinie ${session.bookingTimeSlot}.`,
      'booking_accepted'
    );

    res.json(response.data);
  } catch (error) {
    console.error('Error accepting booking:', error.response?.data || error.message);
    res.status(500).json({ error: 'Nie udało się zaakceptować rezerwacji' });
  }
});

// Decline Booking
app.post('/api/booking/decline', async (req, res) => {
  const { sessionId } = req.body;
  if (!sessionId) {
    return res.status(400).json({ error: 'Brak sessionId' });
  }

  try {
    const sessionRes = await flotiqClient.get(`/tutor_session/${sessionId}`);
    const session = sessionRes.data;
    if (!session) {
      return res.status(404).json({ error: 'Rezerwacja nie została znaleziona' });
    }

    session.status = 'declined';
    const response = await flotiqClient.put(`/tutor_session/${sessionId}`, session);

    // Trigger Notification to Student
    await createAndSendNotification(
      session.studentClerkId,
      'Rezerwacja lekcji została odrzucona ❌',
      `Korepetytor odrzucił rezerwację na dzień ${session.bookingDate} o godzinie ${session.bookingTimeSlot}.`,
      'booking_declined'
    );

    res.json(response.data);
  } catch (error) {
    console.error('Error declining booking:', error.response?.data || error.message);
    res.status(500).json({ error: 'Nie udało się odrzucić rezerwacji' });
  }
});

// Start Scheduled Booking Session (provisions Daily.co room)
app.post('/api/booking/start', async (req, res) => {
  const { sessionId } = req.body;
  if (!sessionId) {
    return res.status(400).json({ error: 'Brak sessionId' });
  }

  try {
    const sessionRes = await flotiqClient.get(`/tutor_session/${sessionId}`);
    const session = sessionRes.data;
    if (!session || (session.status !== 'scheduled' && session.status !== 'pending_booking')) {
      return res.status(400).json({ error: 'Rezerwacja nie jest zaplanowana lub nie istnieje' });
    }

    let dailyRoomUrl = '';
    const roomName = `studybuddy_booked_${Date.now()}`;

    if (DAILY_API_KEY && DAILY_API_KEY !== 'your_daily_co_api_key_here') {
      try {
        const dailyResponse = await axios.post(
          'https://api.daily.co/v1/rooms',
          {
            name: roomName,
            properties: {
              enable_chat: true,
              enable_recording: 'cloud',
              exp: Math.floor(Date.now() / 1000) + 7200, // 2 hours
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
        console.warn('Daily.co API error with cloud recording, retrying without recording:', dailyError.message);
        try {
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
          dailyRoomUrl = `https://meet.jit.si/${roomName}`;
        }
      }
    } else {
      dailyRoomUrl = `https://meet.jit.si/${roomName}`;
    }

    session.status = 'active';
    session.startTime = new Date().toISOString();
    session.dailyRoomUrl = dailyRoomUrl;

    const response = await flotiqClient.put(`/tutor_session/${sessionId}`, session);
    res.json(response.data);
  } catch (error) {
    console.error('Error starting scheduled session:', error.response?.data || error.message);
    res.status(500).json({ error: 'Nie udało się rozpocząć zaplanowanej lekcji' });
  }
});

// List bookings for Student or Tutor
app.get('/api/booking/list/:clerkId', async (req, res) => {
  const { clerkId } = req.params;
  try {
    // Query student sessions
    const studentFilter = encodeURIComponent(JSON.stringify({
      studentClerkId: { type: 'equals', filter: clerkId }
    }));
    const studentRes = await flotiqClient.get(`/tutor_session?filters=${studentFilter}`);
    
    // Query tutor sessions
    const tutorFilter = encodeURIComponent(JSON.stringify({
      tutorClerkId: { type: 'equals', filter: clerkId }
    }));
    const tutorRes = await flotiqClient.get(`/tutor_session?filters=${tutorFilter}`);
    
    const bookings = [
      ...(studentRes.data.data || []),
      ...(tutorRes.data.data || [])
    ].filter(s => ['pending_booking', 'scheduled', 'declined', 'canceled', 'completed'].includes(s.status));
    
    // Sort by bookingDate and bookingTimeSlot
    bookings.sort((a, b) => {
      if (a.bookingDate !== b.bookingDate) {
        return new Date(a.bookingDate) - new Date(b.bookingDate);
      }
      return (a.bookingTimeSlot || '').localeCompare(b.bookingTimeSlot || '');
    });
    
    res.json(bookings);
  } catch (error) {
    console.error('Error listing bookings:', error.response?.data || error.message);
    res.status(500).json({ error: 'Nie udało się pobrać rezerwacji' });
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

  const roomName = `studybuddy_debug_${Date.now()}`;
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
  console.log(`🚀 StudyBuddy Live Backend Server running on port ${PORT}`);
});

// Setup WebSocket Server for drawing synchronization fallback
const wss = new WebSocketServer({ noServer: true });

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
