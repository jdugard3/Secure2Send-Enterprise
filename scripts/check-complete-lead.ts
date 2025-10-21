import { env } from '../server/env';

async function checkLead() {
  const leadId = '1723'; // Underwriting - Ready for Review (likely has complete data)
  const baseUrl = 'https://iris.corduro.com/api/v1';
  
  console.log(`🔍 Fetching Lead #${leadId} (Underwriting - Ready for Review)...\n`);
  
  const response = await fetch(`${baseUrl}/leads/${leadId}`, {
    headers: {
      'X-API-KEY': env.IRIS_CRM_API_KEY,
      'accept': 'application/json',
    },
  });

  if (!response.ok) {
    console.log(`⚠️ Failed to fetch lead ${leadId}: ${response.status}`);
    return;
  }

  const lead = await response.json();
  
  // Focus on the problem fields
  const problemFieldIds = {
    '4273': 'Multiple Locations',
    '3861': 'Entity Type',
    '3779': 'Owner/Officer',
    '3780': 'Owner Title',
    '4269': 'Owner Country',
    '4270': 'FR Country',
    '4278': 'Business Type',
    '4174': 'Previously Processed',
    '4316': 'Automatic Billing',
    '4181': 'Refund/Guarantee',
    '4298': "BO's ID Type",
    '4307': 'BO SSN or TIN from US',
    '4297': 'BO Control Person'
  };
  
  console.log('📋 Problem Fields in Lead 1723 (Working Example):\n');
  console.log('='.repeat(80));
  
  if (lead.details && Array.isArray(lead.details)) {
    for (const section of lead.details) {
      for (const field of section.fields || []) {
        const fieldId = field.id?.toString();
        if (fieldId && problemFieldIds[fieldId]) {
          console.log(`[${fieldId}] ${field.field}:`);
          console.log(`  Current value: "${field.value || '(empty)'}"`);
          console.log(`  Field name: ${problemFieldIds[fieldId]}`);
          console.log('');
        }
      }
    }
  }
}

checkLead().catch(console.error);

