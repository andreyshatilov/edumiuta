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
            reviewsCount: { type: 'number' }
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
        reviewsCount: { label: 'Total Reviews', unique: false, inputType: 'number' }
      },
      order: ['clerkId', 'name', 'university', 'subject', 'bio', 'pricePerMinute', 'imageUrl', 'isOnline', 'rating', 'reviewsCount']
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
            recordingUrl: { type: 'string' }
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
        startTime: { label: 'Start Time', unique: false, inputType: 'text' },
        endTime: { label: 'End Time', unique: false, inputType: 'text' },
        durationSeconds: { label: 'Duration (seconds)', unique: false, inputType: 'number' },
        cost: { label: 'Cost (PLN)', unique: false, inputType: 'number' },
        status: { label: 'Status (active/completed/failed)', unique: false, inputType: 'text' },
        dailyRoomUrl: { label: 'Daily.co Room URL', unique: false, inputType: 'text' },
        recordingUrl: { label: 'Call Recording URL', unique: false, inputType: 'text' }
      },
      order: ['studentClerkId', 'tutorClerkId', 'startTime', 'endTime', 'durationSeconds', 'cost', 'status', 'dailyRoomUrl', 'recordingUrl']
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
  }
];

async function checkAndCreateSchema(schema) {
  try {
    // Check if CTD exists
    await flotiqApi.get(`/${schema.name}`);
    console.log(`ℹ️ Content Type "${schema.label}" (${schema.name}) już istnieje w Flotiq. Pomijam.`);
  } catch (error) {
    if (error.response && error.response.status === 404) {
      console.log(`⚙️ Tworzenie Content Type "${schema.label}" (${schema.name})...`);
      try {
        await flotiqApi.post('', schema);
        console.log(`✅ Pomyślnie utworzono Content Type "${schema.label}"!`);
      } catch (createError) {
        console.error(`❌ Błąd при создании "${schema.name}":`, createError.response?.data || createError.message);
      }
    } else {
      console.error(`❌ Błąd при проверке "${schema.name}":`, error.response?.data || error.message);
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
