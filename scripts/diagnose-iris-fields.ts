import { env } from '../server/env';

/**
 * Diagnostic script to understand IRIS CRM field requirements
 * This will help us fix the field mapping validation errors
 */
async function diagnoseIrisFields() {
  try {
    if (!env.IRIS_CRM_API_KEY || !env.IRIS_CRM_SUBDOMAIN) {
      console.error('❌ IRIS CRM API key or subdomain not configured');
      process.exit(1);
    }

    const baseUrl = 'https://iris.corduro.com/api/v1';
    
    console.log('🔍 IRIS CRM Field Diagnostics\n');
    console.log('=' .repeat(80));
    
    // Fetch multiple leads that have data to understand field formats
    const leadsToAnalyze = [
      { id: 18766, description: 'New test lead with submitted application' },
      { id: 18708, description: 'Sales - Pre-Sale example' },
      { id: 18460, description: 'Sales - Ready for Review example' },
    ];

    const fieldMetadata: Record<string, {
      name: string;
      values: Set<string>;
      types: Set<string>;
      isLabel?: boolean;
    }> = {};

    for (const { id, description } of leadsToAnalyze) {
      console.log(`\n📊 Fetching Lead #${id} (${description})...\n`);
      
      const response = await fetch(`${baseUrl}/leads/${id}`, {
        headers: {
          'X-API-KEY': env.IRIS_CRM_API_KEY,
          'accept': 'application/json',
        },
      });

      if (!response.ok) {
        console.log(`⚠️ Failed to fetch lead ${id}: ${response.status}`);
        continue;
      }

      const lead = await response.json();
      
      // Analyze all field sections
      if (lead.details && Array.isArray(lead.details)) {
        for (const section of lead.details) {
          console.log(`\n📁 Section: ${section.name} (${section.type})`);
          console.log('-'.repeat(80));
          
          if (section.fields && Array.isArray(section.fields)) {
            for (const field of section.fields) {
              const fieldId = field.id?.toString();
              const fieldName = field.field || 'Unknown';
              const fieldValue = field.value || '';
              
              if (!fieldId) continue;

              // Track field metadata
              if (!fieldMetadata[fieldId]) {
                fieldMetadata[fieldId] = {
                  name: fieldName,
                  values: new Set(),
                  types: new Set(),
                };
              }

              if (fieldValue) {
                fieldMetadata[fieldId].values.add(fieldValue);
              }

              // Detect field type from value
              if (fieldValue) {
                if (fieldValue.match(/^\d{2}\/\d{2}\/\d{4}$/)) {
                  fieldMetadata[fieldId].types.add('date');
                } else if (fieldValue.match(/^\d{3}-\d{3}-\d{4}/)) {
                  fieldMetadata[fieldId].types.add('phone');
                } else if (['Yes', 'No'].includes(fieldValue)) {
                  fieldMetadata[fieldId].types.add('boolean');
                } else if (fieldValue.match(/^\d+(\.\d+)?$/)) {
                  fieldMetadata[fieldId].types.add('number');
                } else {
                  fieldMetadata[fieldId].types.add('text');
                }
              }

              console.log(`  [${fieldId}] ${fieldName}: "${fieldValue}"`);
            }
          }
        }
      }
    }

    // Generate analysis report
    console.log('\n\n' + '='.repeat(80));
    console.log('📋 FIELD ANALYSIS REPORT');
    console.log('='.repeat(80));

    // Group fields by the ones causing errors
    const problemFields = [
      '4273', // Multiple Locations
      '3861', // Entity Type
      '4269', // Owner Country
      '3792', // FR Owner/Officer
      '4270', // FR Country
      '4278', // Business Type
      '3860', // Processed Cards in Past (LABEL)
      '4174', // Previously Processed
      '4316', // Automatic Billing
      '4107', // Cardholder Data 3rd Party (LABEL)
      '4181', // Refund/Guarantee
      '4298', // BO's ID Type
      '4307', // BO SSN or TIN from US
      '4297', // BO Control Person
      '4317', // Application Notes (LABEL)
      '27',   // Legal Phone
      '4327', // Bank Officer Phone
      '3787', // FR Mobile Phone
      '3846', // AC1 Office Phone
      '4151', // AC1 Mobile Phone
    ];

    console.log('\n🔴 PROBLEM FIELDS (from error messages):\n');
    
    for (const fieldId of problemFields) {
      if (fieldMetadata[fieldId]) {
        const field = fieldMetadata[fieldId];
        console.log(`\nField ID: ${fieldId}`);
        console.log(`Name: ${field.name}`);
        console.log(`Types detected: ${Array.from(field.types).join(', ')}`);
        console.log(`Values seen: ${Array.from(field.values).slice(0, 5).join(', ')}${field.values.size > 5 ? '...' : ''}`);
        
        // Suggest fix
        if (field.types.has('phone')) {
          console.log(`💡 Fix: Phone format - appears to need "###-###-####" format`);
        } else if (field.types.has('boolean')) {
          console.log(`💡 Fix: Boolean - values seen: ${Array.from(field.values).join(', ')}`);
        } else if (field.values.size > 0 && field.values.size < 10) {
          console.log(`💡 Fix: Dropdown - valid options: ${Array.from(field.values).join(', ')}`);
        }
      } else {
        console.log(`\n⚠️ Field ID: ${fieldId} - Not found in any analyzed lead`);
      }
    }

    // Phone number analysis
    console.log('\n\n' + '='.repeat(80));
    console.log('📞 PHONE NUMBER FORMAT ANALYSIS');
    console.log('='.repeat(80));
    
    const phoneFields = Object.entries(fieldMetadata)
      .filter(([_, field]) => field.types.has('phone'));
    
    console.log(`\nFound ${phoneFields.length} phone number fields:\n`);
    for (const [fieldId, field] of phoneFields) {
      console.log(`[${fieldId}] ${field.name}`);
      field.values.forEach(value => {
        console.log(`  Example: "${value}"`);
      });
    }

    // Dropdown/enum analysis
    console.log('\n\n' + '='.repeat(80));
    console.log('📋 DROPDOWN/ENUM FIELD ANALYSIS');
    console.log('='.repeat(80));
    
    const dropdownFields = Object.entries(fieldMetadata)
      .filter(([_, field]) => field.values.size > 0 && field.values.size < 20 && !field.types.has('phone') && !field.types.has('date'));
    
    console.log(`\nFound ${dropdownFields.length} potential dropdown fields:\n`);
    for (const [fieldId, field] of dropdownFields) {
      if (problemFields.includes(fieldId)) {
        console.log(`\n🔴 [${fieldId}] ${field.name} (ERROR FIELD)`);
      } else {
        console.log(`\n[${fieldId}] ${field.name}`);
      }
      console.log(`  Valid options: ${Array.from(field.values).join(', ')}`);
    }

    // Generate code suggestions
    console.log('\n\n' + '='.repeat(80));
    console.log('💻 SUGGESTED CODE FIXES');
    console.log('='.repeat(80));

    console.log('\n// Update mapDropdownValue() in irisCrmService.ts:\n');
    console.log('const dropdownMappings: Record<string, Record<string, string>> = {');
    
    for (const [fieldId, field] of dropdownFields) {
      if (problemFields.includes(fieldId) && field.values.size > 0 && field.values.size < 10) {
        console.log(`  '${fieldId}': { // ${field.name}`);
        Array.from(field.values).forEach(value => {
          const key = value.toUpperCase().replace(/[^A-Z0-9]/g, '_');
          console.log(`    '${key}': '${value}',`);
        });
        console.log('  },');
      }
    }
    console.log('};\n');

    // Label field detection
    console.log('\n📛 LABEL FIELDS TO REMOVE FROM UPDATES:\n');
    const labelFields = ['3860', '4107', '4317'];
    labelFields.forEach(fieldId => {
      if (fieldMetadata[fieldId]) {
        console.log(`- Field ${fieldId}: ${fieldMetadata[fieldId].name}`);
      } else {
        console.log(`- Field ${fieldId}: (not found in data, but marked as label by API)`);
      }
    });

    console.log('\n\n✅ Diagnostic complete!');
    console.log('Review the output above to fix the field mapping errors.');

  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

diagnoseIrisFields();

