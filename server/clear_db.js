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
  console.error('❌ Error: FLOTIQ_API_KEY is missing in server/.env!');
  process.exit(1);
}

const flotiqClient = axios.create({
  baseURL: 'https://api.flotiq.com/api/v1/content',
  headers: {
    'X-Auth-Token': apiKey,
    'Content-Type': 'application/json',
  },
});

const CONTENT_TYPES = [
  'student_profile',
  'tutor_profile',
  'tutor_session',
  'wallet_transaction',
  'payout_request',
  'system_notification',
  'tutor_review',
  'newsletter_subscriber'
];

async function clearContentType(contentTypeName) {
  console.log(`🧹 Clearing all records for content type: ${contentTypeName}...`);
  let deletedCount = 0;

  try {
    while (true) {
      const response = await flotiqClient.get(`/${contentTypeName}?limit=100`);
      const records = response.data.data || [];
      if (records.length === 0) {
        break;
      }

      console.log(`Found ${records.length} records to delete.`);
      const deletePromises = records.map(async (record) => {
        try {
          await flotiqClient.delete(`/${contentTypeName}/${record.id}`);
          deletedCount++;
        } catch (delErr) {
          console.error(`❌ Failed to delete record ${record.id} in ${contentTypeName}:`, delErr.message);
        }
      });

      await Promise.all(deletePromises);
    }
    console.log(`✅ Cleared ${deletedCount} records for: ${contentTypeName}`);
  } catch (error) {
    console.error(`❌ Failed to fetch/clear content type ${contentTypeName}:`, error.response?.data || error.message);
  }
}

async function run() {
  console.log('🚀 Starting full Flotiq database cleanup...');
  for (const contentType of CONTENT_TYPES) {
    await clearContentType(contentType);
  }
  console.log('🎉 Database cleanup completed successfully!');
}

run();
