import { PDFDocument } from 'pdf-lib';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Script to inspect PDF form fields from the Corduro MSA template
 * This helps us understand what fields exist in the PDF so we can map them
 * to merchant application data
 */
async function inspectPdfFields() {
  try {
    const pdfPath = path.join(__dirname, '../uploads/CorduroMSA_CRB (2025.10.23) (5).pdf');
    
    console.log('📄 Loading PDF from:', pdfPath);
    
    if (!fs.existsSync(pdfPath)) {
      console.error('❌ PDF file not found at:', pdfPath);
      process.exit(1);
    }
    
    const pdfBytes = fs.readFileSync(pdfPath);
    const pdfDoc = await PDFDocument.load(pdfBytes);
    
    console.log('✅ PDF loaded successfully\n');
    console.log(`📊 PDF Info:`);
    console.log(`   - Pages: ${pdfDoc.getPageCount()}`);
    console.log(`   - Title: ${pdfDoc.getTitle() || 'N/A'}`);
    console.log(`   - Author: ${pdfDoc.getAuthor() || 'N/A'}\n`);
    
    // Get the form
    const form = pdfDoc.getForm();
    const fields = form.getFields();
    
    console.log(`📋 Total Form Fields: ${fields.length}\n`);
    console.log('='.repeat(80));
    
    if (fields.length === 0) {
      console.log('⚠️  No form fields found in this PDF.');
      console.log('   This PDF might not have fillable form fields.');
      console.log('   We may need to use a different approach (text overlay).\n');
      return;
    }
    
    // Group fields by type
    const fieldsByType: Record<string, any[]> = {
      text: [],
      checkbox: [],
      radio: [],
      dropdown: [],
      button: [],
      other: []
    };
    
    fields.forEach(field => {
      const name = field.getName();
      const type = field.constructor.name;
      
      let fieldType = 'other';
      if (type.includes('Text')) fieldType = 'text';
      else if (type.includes('CheckBox')) fieldType = 'checkbox';
      else if (type.includes('Radio')) fieldType = 'radio';
      else if (type.includes('Dropdown')) fieldType = 'dropdown';
      else if (type.includes('Button')) fieldType = 'button';
      
      fieldsByType[fieldType].push({
        name,
        type,
        field
      });
    });
    
    // Print summary by type
    console.log('📊 Fields by Type:');
    Object.entries(fieldsByType).forEach(([type, typeFields]) => {
      if (typeFields.length > 0) {
        console.log(`   ${type}: ${typeFields.length} fields`);
      }
    });
    console.log('\n' + '='.repeat(80) + '\n');
    
    // Print detailed field information
    console.log('📝 Detailed Field List:\n');
    
    let fieldNumber = 1;
    Object.entries(fieldsByType).forEach(([type, typeFields]) => {
      if (typeFields.length === 0) return;
      
      console.log(`\n${'='.repeat(80)}`);
      console.log(`${type.toUpperCase()} FIELDS (${typeFields.length})`);
      console.log('='.repeat(80) + '\n');
      
      typeFields.forEach(({ name, type: fieldType, field }) => {
        console.log(`[${fieldNumber}] "${name}"`);
        console.log(`    Type: ${fieldType}`);
        
        try {
          // Try to get current value
          if (fieldType.includes('Text')) {
            const textField = field as any;
            const value = textField.getText?.();
            console.log(`    Current Value: ${value ? `"${value}"` : '(empty)'}`);
            console.log(`    Max Length: ${textField.getMaxLength?.() || 'unlimited'}`);
          } else if (fieldType.includes('CheckBox')) {
            const checkboxField = field as any;
            const isChecked = checkboxField.isChecked?.();
            console.log(`    Checked: ${isChecked ? 'Yes' : 'No'}`);
          }
        } catch (e) {
          // Some methods might not be available
        }
        
        console.log('');
        fieldNumber++;
      });
    });
    
    console.log('\n' + '='.repeat(80));
    console.log('✅ Inspection Complete!');
    console.log('='.repeat(80) + '\n');
    
    // Generate a mapping template
    console.log('📋 Suggested TypeScript Field Mapping Template:\n');
    console.log('```typescript');
    console.log('const PDF_FIELD_MAPPING: Record<string, string> = {');
    fields.slice(0, 10).forEach(field => {
      const name = field.getName();
      console.log(`  '${name}': 'application.???', // TODO: Map to merchant application field`);
    });
    if (fields.length > 10) {
      console.log(`  // ... ${fields.length - 10} more fields`);
    }
    console.log('};');
    console.log('```\n');
    
  } catch (error) {
    console.error('❌ Error inspecting PDF:', error);
    process.exit(1);
  }
}

// Run the inspection
inspectPdfFields();

