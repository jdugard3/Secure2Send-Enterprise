# KindTap Agreement E-Signature Integration

## Overview
This feature allows admins to optionally include the KindTap Merchant Agreement PDF when sending a merchant application for e-signatures via SignNow.

## Implementation Summary

### 1. Backend Changes

#### PDF Fill Service (`server/services/pdfFillService.ts`)
Added three new methods to handle PDF merging:

- **`KINDTAP_AGREEMENT_PATH`**: Path constant pointing to the KindTap agreement PDF
  ```typescript
  private static readonly KINDTAP_AGREEMENT_PATH = path.join(
    process.cwd(),
    'uploads/KindTap Merchant Agreement_08012023.pdf'
  );
  ```

- **`mergePDFWithKindTapAgreement(filledApplicationBuffer: Buffer): Promise<Buffer>`**
  - Takes the filled merchant application PDF
  - Loads the KindTap agreement PDF from uploads folder
  - Merges both PDFs (application first, then KindTap agreement)
  - Returns the combined PDF buffer

- **`fillAndMergeMerchantApplicationPDF(application, includeKindTapAgreement): Promise<Buffer>`**
  - Main method that fills the application PDF
  - Optionally merges with KindTap agreement if checkbox is checked
  - Returns either the standalone application PDF or the merged version

#### API Route (`server/routes.ts`)
Updated the `/api/merchant-applications/:id/send-for-signature` endpoint:

- Accepts new request body parameter: `includeKindTapAgreement` (boolean)
- Uses `fillAndMergeMerchantApplicationPDF()` instead of `fillMerchantApplicationPDF()`
- Updates filename to indicate when KindTap agreement is included
- Logs the inclusion in audit trail
- Enhanced console logging to track PDF merging

**Changes made:**
```typescript
// Request body now includes:
const { includeKindTapAgreement } = req.body;

// PDF generation:
const filledPdfBuffer = await PdfFillService.fillAndMergeMerchantApplicationPDF(
  application,
  includeKindTapAgreement || false
);

// Filename reflects content:
const documentFilename = includeKindTapAgreement
  ? `merchant-application-with-kindtap-${businessName}.pdf`
  : `merchant-application-${businessName}.pdf`;

// Audit trail includes flag:
metadata: {
  action: 'send_for_signature',
  merchantEmail: clientUser.email,
  adminEmail: user.email,
  includeKindTapAgreement: includeKindTapAgreement || false,
}
```

### 2. Frontend Changes

#### Merchant Applications List (`client/src/components/admin/merchant-applications-list.tsx`)

**New State:**
```typescript
const [includeKindTapAgreement, setIncludeKindTapAgreement] = useState(false);
```

**Updated Mutation:**
- Changed from passing just `applicationId` to passing an object with both `applicationId` and `includeKindTapAgreement`
- Updated success toast to indicate when KindTap agreement was included
- Resets checkbox after successful send

**UI Changes:**
Added a checkbox in the E-Signature section:
- Appears above the "Send for E-Signature" button
- Blue highlighted box with clear label
- Shows confirmation text when checked
- Located in the approved applications dialog, E-Signature section

```tsx
<div className="flex items-center space-x-2 p-3 bg-blue-50 border border-blue-200 rounded-lg">
  <Checkbox
    id="include-kindtap-agreement"
    checked={includeKindTapAgreement}
    onCheckedChange={(checked) => setIncludeKindTapAgreement(checked === true)}
  />
  <Label htmlFor="include-kindtap-agreement">
    Include KindTap Merchant Agreement in e-signature documents
  </Label>
</div>
```

## Usage Flow

1. Admin reviews and approves a merchant application
2. Admin clicks "Review" button on approved application
3. In the dialog, under "E-Signature" section:
   - Admin sees checkbox: "Include KindTap Merchant Agreement in e-signature documents"
   - If checked, the KindTap agreement will be appended to the application PDF
   - Click "Send for E-Signature" button
4. System:
   - Fills the merchant application PDF with data
   - If checkbox was checked: merges KindTap agreement PDF after the application
   - Uploads combined PDF to SignNow
   - Sends signing invitations to merchant and admin
5. Signers receive a single document containing:
   - Merchant application (filled with their data)
   - KindTap agreement (if checkbox was checked)

## File Locations

- **KindTap Agreement PDF**: `uploads/KindTap Merchant Agreement_08012023.pdf` (482KB)
- **Application Template**: `templates/NEW CorduroMSA_CRB (combined).pdf`

## Security Considerations

- Only admins can send for e-signature
- Checkbox state is validated on the server
- Audit trail logs whether KindTap agreement was included
- PDF merging happens server-side using pdf-lib library
- No file path manipulation vulnerabilities (uses constants)

## Testing Checklist

### Manual Testing Steps:

1. **Test without KindTap agreement:**
   - [ ] Leave checkbox unchecked
   - [ ] Send for e-signature
   - [ ] Verify PDF only contains merchant application
   - [ ] Verify filename: `merchant-application-{businessName}.pdf`

2. **Test with KindTap agreement:**
   - [ ] Check the checkbox
   - [ ] Verify confirmation text appears
   - [ ] Send for e-signature
   - [ ] Verify PDF contains both application and KindTap agreement
   - [ ] Verify filename: `merchant-application-with-kindtap-{businessName}.pdf`
   - [ ] Verify page count increased (application pages + KindTap pages)

3. **Test UI behavior:**
   - [ ] Checkbox appears only for approved applications
   - [ ] Checkbox appears only when e-signature status is NOT_SENT
   - [ ] Checkbox resets after successful send
   - [ ] Toast notification mentions KindTap when included
   - [ ] Checkbox state persists while dialog is open

4. **Test error handling:**
   - [ ] If KindTap PDF is missing, error is logged and reported
   - [ ] Proper error messages displayed to admin
   - [ ] Application doesn't break if KindTap PDF can't be loaded

### Backend Validation:

```bash
# Check console logs for:
- "📋 KindTap agreement will be included in the document package"
- "📑 Starting PDF merge with KindTap agreement..."
- "📄 Filled application pages: X"
- "📄 KindTap agreement pages: Y"
- "✅ Merged PDF created with Z total pages"
- "✅ PDF prepared successfully (XXX bytes) - includes KindTap agreement"
```

## Future Enhancements

1. **Additional Documents**: Extend to support multiple additional documents via checkboxes
2. **Preview**: Add ability to preview merged PDF before sending
3. **Custom Templates**: Allow admins to select from multiple agreement templates
4. **Document Order**: Allow admins to choose order of documents in merged PDF
5. **Version Control**: Track which version of KindTap agreement was used

## Dependencies

- `pdf-lib`: Used for PDF manipulation (already installed)
- No new dependencies added

## Rollback Plan

If issues arise:
1. Checkbox can be hidden via CSS/commented out
2. Backend will safely ignore `includeKindTapAgreement` parameter if undefined
3. System will function exactly as before (sending only application PDF)

## Support

For issues or questions:
- Check server logs for PDF merging errors
- Verify KindTap PDF exists at `uploads/KindTap Merchant Agreement_08012023.pdf`
- Ensure pdf-lib package is installed
- Check audit logs for tracking which applications included KindTap agreement












