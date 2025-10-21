import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const IRIS_API_KEY = process.env.IRIS_CRM_API_KEY;
const IRIS_LEAD_ID = '18767'; // From the error log

// Fields that are failing validation
const FAILING_FIELDS = [
  '4273', // Multiple Locations
  '3861', // Entity Type
  '3779', // Owner/Officer
  '3780', // Owner Title
  '4269', // Owner Country
  '4270', // FR Country
  '4278', // Business Type
  '4174', // Previously Processed
  '4316', // Automatic Billing
  '4181', // Refund/Guarantee
  '4298', // BO's ID Type
  '4307', // BO SSN or TIN from US
  '4297', // BO Control Person
];

async function fetchFieldMetadata(fieldId: string) {
  try {
    const response = await fetch(
      `https://iris.corduro.com/api/v1/lead-field?id=${fieldId}`,
      {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${IRIS_API_KEY}`,
          'Content-Type': 'application/json',
        },
      }
    );

    if (!response.ok) {
      throw new Error(`Failed to fetch field ${fieldId}: ${response.status}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error(`❌ Error fetching field ${fieldId}:`, error);
    return null;
  }
}

async function main() {
  console.log('🔍 Fetching metadata for failing fields...\n');

  for (const fieldId of FAILING_FIELDS) {
    console.log(`\n${'='.repeat(80)}`);
    console.log(`📋 Field ID: ${fieldId}`);
    console.log('='.repeat(80));
    
    const metadata = await fetchFieldMetadata(fieldId);
    
    if (metadata) {
      console.log(`Name: ${metadata.name}`);
      console.log(`Type: ${metadata.type}`);
      console.log(`Required: ${metadata.required}`);
      
      if (metadata.dropdown_options) {
        console.log('\n✅ Valid Dropdown Options:');
        metadata.dropdown_options.forEach((option: any) => {
          console.log(`  - "${option.value}" (ID: ${option.id})`);
        });
      }
      
      if (metadata.checkbox_options) {
        console.log('\n✅ Valid Checkbox Options:');
        metadata.checkbox_options.forEach((option: any) => {
          console.log(`  - "${option.value}" (ID: ${option.id})`);
        });
      }
    }
    
    // Small delay to avoid rate limiting
    await new Promise(resolve => setTimeout(resolve, 200));
  }
}

main().catch(console.error);

