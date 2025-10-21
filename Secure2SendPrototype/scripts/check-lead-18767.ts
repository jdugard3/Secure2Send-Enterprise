import { env } from '../server/env';

async function checkLead() {
  const leadId = '18767';
  const baseUrl = 'https://iris.corduro.com/api/v1';
  
  console.log(`🔍 Fetching Lead #${leadId}...\n`);
  
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
  const problemFieldIds = [
    '4273', '3861', '3779', '3780', '4269', '4270', '4278', 
    '4174', '4316', '4181', '4298', '4307', '4297'
  ];
  
  console.log('📋 Problem Fields in Lead 18767:\n');
  console.log('='.repeat(80));
  
  if (lead.details && Array.isArray(lead.details)) {
    for (const section of lead.details) {
      for (const field of section.fields || []) {
        const fieldId = field.id?.toString();
        if (fieldId && problemFieldIds.includes(fieldId)) {
          console.log(`[${fieldId}] ${field.field}: "${field.value || ''}"`);
        }
      }
    }
  }
}

checkLead().catch(console.error);

