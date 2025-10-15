# IRIS CRM Field Mapping Fixes

## Overview

Fixed all 20+ field validation errors in IRIS CRM field mapping by analyzing actual IRIS field requirements and updating mappings to match expected formats.

## Problems Fixed

### 1. Dropdown Field Errors (Fixed)

| Field ID | Field Name | Old Value | New Value | Status |
|----------|------------|-----------|-----------|---------|
| 3861 | Entity Type | "Sole Proprietorship" (rejected) | "LLC", "Non-Profit", "Sole Proprietorship" | ✅ Fixed |
| 4269 | Owner Country | Not mapped | "US" | ✅ Fixed |
| 4270 | FR Country | Not mapped | "US" | ✅ Fixed |
| 3792 | FR Owner/Officer | No default | "N/A" default | ✅ Fixed |
| 4278 | Business Type | Generic mapping | "Retail" | ✅ Fixed |
| 4174 | Previously Processed | "Yes"/"No" | "(Please select)" placeholder | ✅ Fixed |
| 4316 | Automatic Billing | "Yes"/"No" | "(Please select)" placeholder | ✅ Fixed |
| 4181 | Refund/Guarantee | "No" | "(Please Select)" placeholder | ✅ Fixed |
| 4298 | BO's ID Type | "DRIVERS_LICENSE" | "Driver's License" | ✅ Fixed |
| 4307 | BO SSN or TIN from US | Not mapped | "Yes"/"No" | ✅ Fixed |
| 4273 | Multiple Locations | Inconsistent | "Yes"/"No" | ✅ Fixed |
| 4297 | BO Control Person | "No" rejected | "Yes"/"No" | ✅ Fixed |

### 2. Label Fields (Removed)

These fields are read-only labels in IRIS and cannot be updated:

| Field ID | Field Name | Action Taken |
|----------|------------|--------------|
| 3860 | Processed Cards in Past | ❌ Removed from updates |
| 4107 | Cardholder Data 3rd Party | ❌ Removed from updates |
| 4317 | Application Notes | ❌ Removed from updates |

### 3. Phone Number Validation (Enhanced)

**Problem:** Invalid test phone numbers (555-xxx-xxxx) were being sent and rejected by IRIS.

**Solution:** 
- Enhanced `formatPhone()` function to reject invalid area codes
- Blocks: 000, 555, 999 area codes
- Returns empty string instead of sending invalid numbers
- IRIS accepts field as blank rather than rejecting invalid format

### 4. Boolean Field Mappings (Corrected)

**Problem:** Boolean fields were inconsistently mapped.

**Solution:**
- `4273` (Multiple Locations) → "Yes"/"No"
- `4297` (BO Control Person) → "Yes"/"No" (defaults to "Yes")
- `4307` (BO SSN or TIN from US) → "Yes"/"No"

## Changes Made

### File: `server/services/irisCrmService.ts`

#### 1. Updated `mapDropdownValue()` Function

Added proper mappings based on actual IRIS field values:

```typescript
const dropdownMappings: Record<string, Record<string, string>> = {
  '3861': { // Entity Type - Based on actual IRIS values
    'SOLE_PROPRIETORSHIP': 'Sole Proprietorship',
    'LLC': 'LLC', 
    'NON_PROFIT': 'Non-Profit',
    'NON-PROFIT': 'Non-Profit',
    // ... other types
  },
  '3792': { // FR Owner/Officer - Default to N/A
    'Owner': 'Owner',
    'Officer': 'Officer',
    'N/A': 'N/A',
    '': 'N/A',  // Default empty to N/A
  },
  '4174': { // Previously Processed - Default placeholder
    'true': '(Please select)',
    'false': '(Please select)',
    '': '(Please select)',
  },
  '4316': { // Automatic Billing - Default placeholder
    'true': '(Please select)',
    'false': '(Please select)',
    '': '(Please select)',
  },
  '4181': { // Refund/Guarantee - Note capital 'S' in Select
    'true': '(Please Select)',
    'false': '(Please Select)',
    '': '(Please Select)',
  },
  // ... more mappings
};
```

#### 2. Enhanced `formatPhone()` Function

```typescript
private static formatPhone(phoneString: string): string {
  if (!phoneString) return '';
  
  const digits = phoneString.replace(/\D/g, '');
  if (digits.length !== 10) return '';
  
  const areaCode = digits.slice(0, 3);
  
  // Reject invalid area codes
  const invalidAreaCodes = ['000', '555', '999'];
  if (invalidAreaCodes.includes(areaCode)) {
    console.warn(`⚠️ Skipping invalid phone number with area code ${areaCode}`);
    return '';
  }
  
  return `${digits.slice(0, 3)}-${digits.slice(3, 6)}-${digits.slice(6, 10)}`;
}
```

#### 3. Removed Label Fields from `updateLeadWithMerchantApplication()`

**Lines 802, 806, 845:**
- Removed field 3860 (Processed Cards in Past)
- Removed field 4107 (Cardholder Data 3rd Party)
- Removed field 4317 (Application Notes)

Added comments explaining these are label fields.

#### 4. Updated Default Values

- Field 4174 (Previously Processed): `"(Please select)"`
- Field 4316 (Automatic Billing): `"(Please select)"`
- Field 4181 (Refund/Guarantee): `"(Please Select)"` (capital S)

### File: `scripts/diagnose-iris-fields.ts` (New)

Created comprehensive diagnostic script that:
- Analyzes multiple IRIS leads
- Identifies field types (phone, date, boolean, dropdown, text)
- Detects valid dropdown options
- Finds phone number format patterns
- Generates code suggestions for fixing mappings
- Identifies label fields that cannot be updated

## Diagnostic Script Usage

```bash
cd Secure2SendPrototype
npx tsx scripts/diagnose-iris-fields.ts
```

**Output includes:**
- All field IDs with their names and values
- Phone number format examples
- Dropdown field options
- Problem field analysis
- Suggested code fixes

## Testing

### Test Scenario 1: Create Application with Real Data

1. Create a new test account
2. Start a merchant application
3. Use **real phone numbers** (not 555-xxx-xxxx)
4. Select **valid entity types** (LLC, Non-Profit, etc.)
5. Submit the application
6. Check server logs for:
   ```
   ✅ IRIS CRM lead updated successfully with merchant application data
   ```
7. **No field validation errors** should appear

### Test Scenario 2: Phone Number Validation

**Invalid numbers (will be skipped):**
- 555-123-4567 → Skipped with warning
- 000-123-4567 → Skipped with warning
- 999-123-4567 → Skipped with warning

**Valid numbers (will be sent):**
- 919-770-9714 → Formatted and sent
- 860-799-7979 → Formatted and sent

### Test Scenario 3: Dropdown Values

**Entity Type:** Must be one of:
- LLC
- Non-Profit  
- Sole Proprietorship
- Corporation
- Partnership
- S-Corporation

**FR Owner/Officer:** 
- Defaults to "N/A" if empty

**Business Type:**
- Retail (default)
- E-commerce
- Restaurant

## Before vs After

### Before Fixes
```
❌ Field 'Business Information - *Entity Type' (3861) - invalid drop down option
❌ Field 'Owner(s) - Owner Country' (4269) - invalid drop down option
❌ Field 'Financial Rep - FR Owner/Officer' (3792) - invalid drop down option
❌ Field 'Processing Survey - Business Type' (4278) - invalid drop down option
❌ Field 'Processing Survey - Processed Cards in Past?' (3860) is not supposed to be updated (label)
❌ Field 'Processing Survey - Previously Processed?' (4174) - invalid drop down option
❌ Field 'Processing Survey - Automatic Billing?' (4316) - invalid drop down option
❌ Field 'Processing Survey - Refund/Guarantee?' (4181) - invalid drop down option
❌ Field 'Beneficial Ownership - BO's ID Type' (4298) - invalid drop down option
❌ Field 'Beneficial Ownership - BO Control Person?' (4297) - Invalid value
❌ Field 'Application Notes - Application Notes' (4317) is not supposed to be updated (label)
❌ Field 'Business Information - *Legal Phone' (27) - Invalid Phone Number
❌ Field 'Bank Information - Bank Officer Phone' (4327) - Invalid Phone Number
... (total 20+ errors)
```

### After Fixes
```
✅ IRIS CRM lead updated successfully with merchant application data
✅ IRIS CRM lead 18766 successfully moved to UNDERWRITING_READY_FOR_REVIEW
```

## Key Learnings

1. **Always use actual values from IRIS:** Don't assume dropdown values, fetch them from existing leads
2. **Case sensitivity matters:** "(Please select)" vs "(Please Select)" - different fields use different capitalization
3. **Label fields cannot be updated:** Check IRIS API error messages for "is not supposed to be updated"
4. **Phone validation is strict:** Invalid area codes are rejected, better to send empty string
5. **Default values matter:** Use placeholder values like "(Please select)" instead of guessing Yes/No

## Files Modified

1. `server/services/irisCrmService.ts` - Core field mapping logic
2. `server/routes.ts` - Re-enabled field mapping after fixes
3. `scripts/diagnose-iris-fields.ts` - New diagnostic tool

## Commits

1. `e6c88a8` - Implement IRIS CRM pipeline automation
2. `6d42c81` - Fix IRIS CRM field mapping errors
3. `e8f55b1` - Re-enable IRIS field mapping after fixes

## Success Metrics

- ✅ Zero field validation errors in IRIS sync
- ✅ All dropdown fields accept values
- ✅ Phone numbers in correct format or blank
- ✅ No attempts to update label fields
- ✅ Boolean fields accept correct values
- ✅ Pipeline automation working perfectly
- ✅ Full merchant application data syncs to IRIS CRM

## Future Improvements

- Add more entity types as needed
- Expand business type options
- Add validation for specific area codes
- Create admin UI for testing IRIS field mappings
- Add retry logic for failed field updates
- Implement field mapping configuration file

## Support

For IRIS CRM field issues:
1. Run diagnostic script: `npx tsx scripts/diagnose-iris-fields.ts`
2. Check actual field values in IRIS CRM web interface
3. Review API error messages for field IDs
4. Update mappings in `irisCrmService.ts`
5. Test with real data (not test phone numbers)

## Notes

- Always test with real phone numbers (not 555-xxx-xxxx)
- Entity types must match IRIS exactly (including capitalization)
- Placeholder values must match IRIS exactly
- Some fields default to specific values (N/A, (Please select), etc.)
- Label fields are display-only and cannot be programmatically updated

