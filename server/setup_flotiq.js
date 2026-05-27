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
        clerkId: { label: 'Clerk User ID' },
        name: { label: 'Full Name' },
        walletBalance: { label: 'Wallet Balance (PLN)' }
      }
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
        clerkId: { label: 'Clerk User ID' },
        name: { label: 'Full Name' },
        university: { label: 'University' },
        subject: { label: 'Subject' },
        bio: { label: 'Biography' },
        pricePerMinute: { label: 'Price per Minute (PLN)' },
        imageUrl: { label: 'Image URL' },
        isOnline: { label: 'Is Available Online?' },
        rating: { label: 'Rating (0-5)' },
        reviewsCount: { label: 'Total Reviews' }
      }
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
        studentClerkId: { label: 'Student Clerk ID' },
        tutorClerkId: { label: 'Tutor Clerk ID' },
        startTime: { label: 'Start Time' },
        endTime: { label: 'End Time' },
        durationSeconds: { label: 'Duration (seconds)' },
        cost: { label: 'Cost (PLN)' },
        status: { label: 'Status (active/completed/failed)' },
        dailyRoomUrl: { label: 'Daily.co Room URL' },
        recordingUrl: { label: 'Call Recording URL' }
      }
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
        clerkId: { label: 'Clerk User ID' },
        amount: { label: 'Amount (PLN)' },
        type: { label: 'Type (deposit/payment/earnings)' },
        timestamp: { label: 'Timestamp' }
      }
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
      // Create CTD
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
