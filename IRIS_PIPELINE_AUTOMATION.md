# IRIS CRM Pipeline Automation

## Overview

This implementation automatically moves leads through IRIS CRM pipeline stages based on merchant application lifecycle events in Secure2Send Enterprise.

## Pipeline Stage Mapping

| Event | IRIS Pipeline Stage | Status ID | Group ID |
|-------|---------------------|-----------|----------|
| Account created | **Ops - Pre-Active** | 158 | 51 |
| Application created/saved as draft | **Sales - Pre-Sale** | 187 | 48 |
| Application submitted | **Sales - Ready for Review** | 193 | 1 |
| Application approved | **Underwriting - Ready for Review** | 171 | 1 |
| Application rejected | **Sales - Declined** | 149 | 28 |

## Implementation Details

### 1. IRIS CRM Service Updates (`server/services/irisCrmService.ts`)

#### Added Pipeline Stage Constants
```typescript
private static readonly PIPELINE_STAGES = {
  OPS_PRE_ACTIVE: { status: 158, group: 51 },
  SALES_PRE_SALE: { status: 187, group: 48 },
  SALES_READY_FOR_REVIEW: { status: 193, group: 1 },
  UNDERWRITING_READY_FOR_REVIEW: { status: 171, group: 1 },
  SALES_DECLINED: { status: 149, group: 28 },
};
```

#### Added `updateLeadStatus()` Method
- Updates lead status and group via PATCH request to IRIS CRM API
- Handles errors gracefully without blocking application flow
- Logs all pipeline stage transitions for debugging

### 2. Routes Updates (`server/routes.ts`)

#### Account Registration (`server/auth.ts`)
- **No changes needed** - Already creates leads in Ops - Pre-Active (status: 158, group: 51)

#### Merchant Application Creation (POST `/api/merchant-applications`)
- Creates IRIS lead if it doesn't exist
- Moves lead to **Sales - Pre-Sale** when application is created

#### Merchant Application Update (PUT `/api/merchant-applications/:id`)
- Moves lead to **Sales - Pre-Sale** when draft is saved

#### Status Change (PUT `/api/merchant-applications/:id/status`)
- **DRAFT** → Sales - Pre-Sale
- **SUBMITTED** → Sales - Ready for Review
- **UNDER_REVIEW** → Sales - Ready for Review (stays in same stage)
- **APPROVED** → Underwriting - Ready for Review
- **REJECTED** → Sales - Declined

## Workflow

### 1. New Account Registration
```
User registers → Lead created in IRIS → Ops - Pre-Active (status: 158, group: 51)
```

### 2. Starting Application
```
User creates application → Lead moves to Sales - Pre-Sale (status: 187, group: 48)
```

### 3. Saving Draft
```
User saves draft → Lead remains in Sales - Pre-Sale (status: 187, group: 48)
```

### 4. Submitting Application
```
User submits application → Lead moves to Sales - Ready for Review (status: 193, group: 1)
```

### 5. Admin Review
```
Admin marks as UNDER_REVIEW → Lead stays in Sales - Ready for Review (status: 193, group: 1)
```

### 6. Approval
```
Admin approves → Lead moves to Underwriting - Ready for Review (status: 171, group: 1)
```

### 7. Rejection
```
Admin rejects → Lead moves to Sales - Declined (status: 149, group: 28)
```

## Error Handling

- All IRIS CRM operations are asynchronous and non-blocking
- Failures in IRIS sync do not prevent application operations
- Comprehensive logging for troubleshooting:
  - `🔄` - Operation in progress
  - `✅` - Success
  - `⚠️` - Warning (non-critical)
  - `❌` - Error (logged but doesn't stop flow)

## Testing

### Test Scenario 1: New User Flow
1. Register a new account
2. Check IRIS CRM - lead should be in "Ops - Pre-Active"
3. Start a merchant application
4. Check IRIS CRM - lead should move to "Sales - Pre-Sale"
5. Submit the application
6. Check IRIS CRM - lead should move to "Sales - Ready for Review"

### Test Scenario 2: Admin Approval Flow
1. As admin, mark application as UNDER_REVIEW
2. Check IRIS CRM - lead should remain in "Sales - Ready for Review"
3. Approve the application
4. Check IRIS CRM - lead should move to "Underwriting - Ready for Review"

### Test Scenario 3: Rejection Flow
1. As admin, reject an application
2. Check IRIS CRM - lead should move to "Sales - Declined"

## Monitoring

Check server logs for IRIS pipeline updates:
```
🔄 Updating IRIS CRM lead {leadId} to pipeline stage: SALES_PRE_SALE
   Status: 187, Group: 48
✅ IRIS CRM lead {leadId} successfully moved to SALES_PRE_SALE
```

## Troubleshooting

### Lead not moving in IRIS CRM
1. Check if `IRIS_CRM_API_KEY` and `IRIS_CRM_SUBDOMAIN` are configured
2. Verify the lead has an `irisLeadId` in the database
3. Check server logs for error messages
4. Verify IRIS CRM API is accessible

### Missing Lead ID
If a client doesn't have an `irisLeadId`:
- The system will automatically create one when needed
- Check logs for "No IRIS lead ID found, creating new lead for client"

### IRIS API Errors
- API errors are logged but don't stop application flow
- Check IRIS CRM API status
- Verify API key has correct permissions

## Database Fields

### clients table
- `iris_lead_id` (VARCHAR) - Stores the IRIS CRM lead ID for tracking

## API Endpoints Used

### IRIS CRM API
- `POST /api/v1/leads` - Create new lead
- `PATCH /api/v1/leads/{leadId}` - Update lead status and group

## Configuration

### Environment Variables Required
```bash
IRIS_CRM_API_KEY=your-api-key
IRIS_CRM_SUBDOMAIN=corduro
```

## Notes

- Pipeline stage transitions are logged for audit purposes
- All IRIS operations are non-blocking to ensure application performance
- Lead creation happens at account registration (existing behavior maintained)
- Pipeline updates happen automatically on application lifecycle events

## Future Enhancements

- Two-way sync (IRIS CRM updates reflected in Secure2Send)
- Bulk pipeline stage updates for existing leads
- Dashboard showing pipeline stage distribution
- Automated notifications on pipeline stage changes

