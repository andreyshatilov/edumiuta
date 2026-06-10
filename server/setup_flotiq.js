import axios from 'axios';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load env variables
dotenv.config({ path: path.join(__dirname, '.env') });

const apiKey = process.env.FLOTIQ_API_KEY;

if (!apiKey || apiKey === 'your_flotiq_rw_api_key_here') {
  console.error('❌ Błąd: Brak prawidłowego FLOTIQ_API_KEY w pliku server/.env!');
  process.exit(1);
}

const flotiqApi = axios.create({
  baseURL: 'https://api.flotiq.com/api/v1/internal/contenttype',
  headers: {
    'X-Auth-Token': apiKey,
    'Content-Type': 'application/json',
  },
});

const SCHEMAS = [
  {
    name: 'student_profile',
    label: 'Student Profile',
    schemaDefinition: {
      allOf: [
        { $ref: '#/components/schemas/AbstractContentTypeSchemaDefinition' },
        {
          type: 'object',
          properties: {
            clerkId: { type: 'string' },
            name: { type: 'string' },
            walletBalance: { type: 'number' }
          },
          required: ['clerkId', 'name', 'walletBalance']
        }
      ],
      additionalProperties: false
    },
    metaDefinition: {
      propertiesConfig: {
        clerkId: { label: 'Clerk User ID', unique: true, inputType: 'text' },
        name: { label: 'Full Name', unique: false, inputType: 'text' },
        walletBalance: { label: 'Wallet Balance (PLN)', unique: false, inputType: 'number' }
      },
      order: ['clerkId', 'name', 'walletBalance']
    }
  },
  {
    name: 'tutor_profile',
    label: 'Tutor Profile',
    schemaDefinition: {
      allOf: [
        { $ref: '#/components/schemas/AbstractContentTypeSchemaDefinition' },
        {
          type: 'object',
          properties: {
            clerkId: { type: 'string' },
            name: { type: 'string' },
            university: { type: 'string' },
            subject: { type: 'string' },
            bio: { type: 'string' },
            pricePerMinute: { type: 'number' },
            imageUrl: { type: 'string' },
            isOnline: { type: 'boolean' },
            rating: { type: 'number' },
            reviewsCount: { type: 'number' },
            linkedin: { type: 'string' },
            videoGreetingUrl: { type: 'string' },
            certificates: { type: 'string' },
            experience: { type: 'string' },
            iban: { type: 'string' },
            availableSlots: { type: 'string' }
          },
          required: ['clerkId', 'name', 'subject', 'pricePerMinute', 'isOnline']
        }
      ],
      additionalProperties: false
    },
    metaDefinition: {
      propertiesConfig: {
        clerkId: { label: 'Clerk User ID', unique: true, inputType: 'text' },
        name: { label: 'Full Name', unique: false, inputType: 'text' },
        university: { label: 'University', unique: false, inputType: 'text' },
        subject: { label: 'Subject', unique: false, inputType: 'text' },
        bio: { label: 'Biography', unique: false, inputType: 'textarea' },
        pricePerMinute: { label: 'Price per Minute (PLN)', unique: false, inputType: 'number' },
        imageUrl: { label: 'Image URL', unique: false, inputType: 'text' },
        isOnline: { label: 'Is Available Online?', unique: false, inputType: 'checkbox' },
        rating: { label: 'Rating (0-5)', unique: false, inputType: 'number' },
        reviewsCount: { label: 'Total Reviews', unique: false, inputType: 'number' },
        linkedin: { label: 'LinkedIn Profile URL', unique: false, inputType: 'text' },
        videoGreetingUrl: { label: 'Video Greeting URL', unique: false, inputType: 'text' },
        certificates: { label: 'Certificates (Separated by comma or newline)', unique: false, inputType: 'textarea' },
        experience: { label: 'Teaching Experience', unique: false, inputType: 'textarea' },
        iban: { label: 'Bank IBAN Account Number', unique: false, inputType: 'text' },
        availableSlots: { label: 'Available Slots (JSON)', unique: false, inputType: 'textarea' }
      },
      order: ['clerkId', 'name', 'university', 'subject', 'bio', 'pricePerMinute', 'imageUrl', 'isOnline', 'rating', 'reviewsCount', 'linkedin', 'videoGreetingUrl', 'certificates', 'experience', 'iban', 'availableSlots']
    }
  },
  {
    name: 'tutor_session',
    label: 'Tutor Session',
    schemaDefinition: {
      allOf: [
        { $ref: '#/components/schemas/AbstractContentTypeSchemaDefinition' },
        {
          type: 'object',
          properties: {
            studentClerkId: { type: 'string' },
            tutorClerkId: { type: 'string' },
            startTime: { type: 'string' },
            endTime: { type: 'string' },
            durationSeconds: { type: 'number' },
            cost: { type: 'number' },
            status: { type: 'string' },
            dailyRoomUrl: { type: 'string' },
            recordingUrl: { type: 'string' },
            studentName: { type: 'string' },
            subject: { type: 'string' },
            approximateTime: { type: 'string' },
            taskDescription: { type: 'string' },
            tutorRate: { type: 'number' },
            bookingDate: { type: 'string' },
            bookingTimeSlot: { type: 'string' }
          },
          required: ['studentClerkId', 'tutorClerkId', 'status']
        }
      ],
      additionalProperties: false
    },
    metaDefinition: {
      propertiesConfig: {
        studentClerkId: { label: 'Student Clerk ID', unique: false, inputType: 'text' },
        tutorClerkId: { label: 'Tutor Clerk ID', unique: false, inputType: 'text' },
        startTime: { label: 'Start Time / Request Time', unique: false, inputType: 'text' },
        endTime: { label: 'End Time', unique: false, inputType: 'text' },
        durationSeconds: { label: 'Duration (seconds)', unique: false, inputType: 'number' },
        cost: { label: 'Cost (PLN)', unique: false, inputType: 'number' },
        status: { label: 'Status (requested/active/completed/declined/canceled/pending_booking/scheduled)', unique: false, inputType: 'text' },
        dailyRoomUrl: { label: 'Daily.co Room URL', unique: false, inputType: 'text' },
        recordingUrl: { label: 'Call Recording URL', unique: false, inputType: 'text' },
        studentName: { label: 'Student Name (RODO)', unique: false, inputType: 'text' },
        subject: { label: 'Subject', unique: false, inputType: 'text' },
        approximateTime: { label: 'Approximate Duration', unique: false, inputType: 'text' },
        taskDescription: { label: 'Task Description', unique: false, inputType: 'textarea' },
        tutorRate: { label: 'Locked Tutor Rate', unique: false, inputType: 'number' },
        bookingDate: { label: 'Booking Date (YYYY-MM-DD)', unique: false, inputType: 'text' },
        bookingTimeSlot: { label: 'Booking Time Slot', unique: false, inputType: 'text' }
      },
      order: ['studentClerkId', 'tutorClerkId', 'startTime', 'endTime', 'durationSeconds', 'cost', 'status', 'dailyRoomUrl', 'recordingUrl', 'studentName', 'subject', 'approximateTime', 'taskDescription', 'tutorRate', 'bookingDate', 'bookingTimeSlot']
    }
  },
  {
    name: 'wallet_transaction',
    label: 'Wallet Transaction',
    schemaDefinition: {
      allOf: [
        { $ref: '#/components/schemas/AbstractContentTypeSchemaDefinition' },
        {
          type: 'object',
          properties: {
            clerkId: { type: 'string' },
            amount: { type: 'number' },
            type: { type: 'string' },
            timestamp: { type: 'string' }
          },
          required: ['clerkId', 'amount', 'type', 'timestamp']
        }
      ],
      additionalProperties: false
    },
    metaDefinition: {
      propertiesConfig: {
        clerkId: { label: 'Clerk User ID', unique: false, inputType: 'text' },
        amount: { label: 'Amount (PLN)', unique: false, inputType: 'number' },
        type: { label: 'Type (deposit/payment/earnings)', unique: false, inputType: 'text' },
        timestamp: { label: 'Timestamp', unique: false, inputType: 'text' }
      },
      order: ['clerkId', 'amount', 'type', 'timestamp']
    }
  },
  {
    name: 'newsletter_subscriber',
    label: 'Newsletter Subscriber',
    schemaDefinition: {
      allOf: [
        { $ref: '#/components/schemas/AbstractContentTypeSchemaDefinition' },
        {
          type: 'object',
          properties: {
            email: { type: 'string' },
            timestamp: { type: 'string' }
          },
          required: ['email', 'timestamp']
        }
      ],
      additionalProperties: false
    },
    metaDefinition: {
      propertiesConfig: {
        email: { label: 'Email Address', unique: true, inputType: 'text' },
        timestamp: { label: 'Subscription Date', unique: false, inputType: 'text' }
      },
      order: ['email', 'timestamp']
    }
  },
  {
    name: 'payout_request',
    label: 'Payout Request',
    schemaDefinition: {
      allOf: [
        { $ref: '#/components/schemas/AbstractContentTypeSchemaDefinition' },
        {
          type: 'object',
          properties: {
            tutorClerkId: { type: 'string' },
            amount: { type: 'number' },
            iban: { type: 'string' },
            status: { type: 'string' },
            timestamp: { type: 'string' }
          },
          required: ['tutorClerkId', 'amount', 'iban', 'status', 'timestamp']
        }
      ],
      additionalProperties: false
    },
    metaDefinition: {
      propertiesConfig: {
        tutorClerkId: { label: 'Tutor Clerk ID', unique: false, inputType: 'text' },
        amount: { label: 'Payout Amount (PLN)', unique: false, inputType: 'number' },
        iban: { label: 'Bank IBAN', unique: false, inputType: 'text' },
        status: { label: 'Status (pending/approved/rejected)', unique: false, inputType: 'text' },
        timestamp: { label: 'Request Timestamp', unique: false, inputType: 'text' }
      },
      order: ['tutorClerkId', 'amount', 'iban', 'status', 'timestamp']
    }
  },
  {
    name: 'system_notification',
    label: 'System Notification',
    schemaDefinition: {
      allOf: [
        { $ref: '#/components/schemas/AbstractContentTypeSchemaDefinition' },
        {
          type: 'object',
          properties: {
            clerkId: { type: 'string' },
            title: { type: 'string' },
            message: { type: 'string' },
            type: { type: 'string' },
            read: { type: 'boolean' },
            timestamp: { type: 'string' }
          },
          required: ['clerkId', 'title', 'message', 'type', 'read', 'timestamp']
        }
      ],
      additionalProperties: false
    },
    metaDefinition: {
      propertiesConfig: {
        clerkId: { label: 'Recipient Clerk ID', unique: false, inputType: 'text' },
        title: { label: 'Notification Title', unique: false, inputType: 'text' },
        message: { label: 'Notification Message', unique: false, inputType: 'text' },
        type: { label: 'Type', unique: false, inputType: 'text' },
        read: { label: 'Is Read?', unique: false, inputType: 'checkbox' },
        timestamp: { label: 'Timestamp', unique: false, inputType: 'text' }
      },
      order: ['clerkId', 'title', 'message', 'type', 'read', 'timestamp']
    }
  },
  {
    name: 'tutor_review',
    label: 'Tutor Review',
    schemaDefinition: {
      allOf: [
        { $ref: '#/components/schemas/AbstractContentTypeSchemaDefinition' },
        {
          type: 'object',
          properties: {
            studentClerkId: { type: 'string' },
            studentName: { type: 'string' },
            tutorClerkId: { type: 'string' },
            sessionId: { type: 'string' },
            rating: { type: 'number' },
            comment: { type: 'string' },
            timestamp: { type: 'string' }
          },
          required: ['studentClerkId', 'tutorClerkId', 'sessionId', 'rating', 'timestamp']
        }
      ],
      additionalProperties: false
    },
    metaDefinition: {
      propertiesConfig: {
        studentClerkId: { label: 'Student Clerk ID', unique: false, inputType: 'text' },
        studentName: { label: 'Student Name', unique: false, inputType: 'text' },
        tutorClerkId: { label: 'Tutor Clerk ID', unique: false, inputType: 'text' },
        sessionId: { label: 'Session ID', unique: false, inputType: 'text' },
        rating: { label: 'Rating (1-5)', unique: false, inputType: 'number' },
        comment: { label: 'Comment', unique: false, inputType: 'textarea' },
        timestamp: { label: 'Timestamp', unique: false, inputType: 'text' }
      },
      order: ['studentClerkId', 'studentName', 'tutorClerkId', 'sessionId', 'rating', 'comment', 'timestamp']
    }
  }
];

async function checkAndCreateSchema(schema) {
  try {
    // Check if CTD exists
    await flotiqApi.get(`/${schema.name}`);
    console.log(`⚙️ Content Type "${schema.label}" (${schema.name}) już istnieje. Aktualizacja schematu (PUT)...`);
    try {
      await flotiqApi.put(`/${schema.name}`, schema);
      console.log(`✅ Pomyślnie zaktualizowano Content Type "${schema.label}"!`);
    } catch (updateError) {
      console.error(`❌ Błąd przy aktualizacji "${schema.name}":`, updateError.response?.data || updateError.message);
    }
  } catch (error) {
    if (error.response && error.response.status === 404) {
      console.log(`⚙️ Tworzenie Content Type "${schema.label}" (${schema.name})...`);
      try {
        await flotiqApi.post('', schema);
        console.log(`✅ Pomyślnie utworzono Content Type "${schema.label}"!`);
      } catch (createError) {
        console.error(`❌ Błąd przy tworzeniu "${schema.name}":`, createError.response?.data || createError.message);
      }
    } else {
      console.error(`❌ Błąd przy sprawdzaniu "${schema.name}":`, error.response?.data || error.message);
    }
  }
}

async function run() {
  console.log('🚀 Rozpoczynanie konfiguracji schematów Flotiq...');
  for (const schema of SCHEMAS) {
    await checkAndCreateSchema(schema);
  }
  console.log('🎉 Konfiguracja zakończona!');
}

run();
