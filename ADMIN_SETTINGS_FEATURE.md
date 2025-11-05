# Admin Settings Feature

## Overview
Added a comprehensive admin settings page that allows administrators to:
1. View and manage their own admin profile
2. Create new administrator accounts
3. View all existing administrator accounts
4. Access MFA settings

## What Was Added

### 1. Backend API Endpoint
**File:** `server/routes.ts`
- **Endpoint:** `POST /api/admin/create-admin`
- **Functionality:** Creates new admin users with MFA requirement
- **Security:** Requires admin authentication
- **Features:**
  - Validates email and password requirements
  - Hashes passwords securely
  - Sets MFA as required for all new admins
  - Sends welcome email to new admin
  - Returns sanitized user data (no password)

### 2. Add Admin Form Component
**File:** `client/src/components/admin/add-admin-form.tsx`
- Modal dialog for creating new admin accounts
- Fields: First Name, Last Name, Email, Password
- Features:
  - Password visibility toggle
  - Secure password generator (16 characters)
  - Minimum 8-character password requirement for admins
  - Form validation
  - Loading states
  - Success/error notifications
  - Security note about MFA requirement

### 3. Admin Settings Page
**File:** `client/src/pages/admin-settings.tsx`
- Comprehensive admin settings dashboard
- Sections:
  - **Your Admin Profile:** Current admin's information
  - **Security Settings:** MFA configuration (reused from existing MfaSettings component)
  - **Administrator Accounts:** List of all admins with ability to add new ones
  - **Account Activity:** Account creation and update history

### 4. Navigation Updates
**Files:** 
- `client/src/components/layout/sidebar.tsx` - Added "Admin Settings" to admin sidebar
- `client/src/App.tsx` - Added route `/admin/settings`

## How to Use

### For Admins:
1. Log in as an admin
2. Click "Admin Settings" in the sidebar
3. Click "Add Admin" button
4. Fill in the new admin's details:
   - First Name
   - Last Name
   - Email
   - Password (or use "Generate Secure Password")
5. Click "Create Admin"
6. New admin will receive a welcome email and must set up MFA on first login

### For New Admins:
1. Receive welcome email with login credentials
2. Log in with provided email and password
3. Will be prompted to set up MFA immediately
4. Must complete MFA setup before accessing the system

## Security Features

### Password Requirements:
- **Admin accounts:** Minimum 8 characters (recommended)
- **Client accounts:** Minimum 6 characters

### MFA (Multi-Factor Authentication):
- **Required for all admin accounts**
- Automatically enforced on first login
- Uses existing MFA system (TOTP/Email OTP)

### Email Notifications:
- New admins receive welcome emails
- Includes login instructions
- No plain-text passwords in emails

## API Reference

### Create Admin User
```typescript
POST /api/admin/create-admin

Headers:
  - Cookie: session token

Body:
{
  "email": "admin@example.com",
  "password": "SecurePass123!",
  "firstName": "John",
  "lastName": "Doe"
}

Response (Success):
{
  "message": "Admin user created successfully",
  "user": {
    "id": "uuid",
    "email": "admin@example.com",
    "firstName": "John",
    "lastName": "Doe",
    "role": "ADMIN"
  }
}

Response (Error):
{
  "message": "Error description"
}
```

## Files Modified/Created

### Created:
- `client/src/pages/admin-settings.tsx`
- `client/src/components/admin/add-admin-form.tsx`

### Modified:
- `server/routes.ts` - Added `/api/admin/create-admin` endpoint
- `client/src/App.tsx` - Added route for admin settings
- `client/src/components/layout/sidebar.tsx` - Added admin settings link

## Testing Checklist

- [x] Admin can access settings page
- [x] Admin can view their own profile
- [x] Admin can view all administrator accounts
- [x] Admin can create new admin accounts
- [x] Form validation works correctly
- [x] Password generator works
- [x] Duplicate email detection works
- [x] Success notifications appear
- [x] Error handling works
- [x] New admin appears in list immediately
- [x] MFA settings section is accessible
- [x] No linter errors

## Future Enhancements (Optional)

1. **Email Change Functionality:** Allow admins to update their email
2. **Password Change:** Allow admins to change their password
3. **Admin Roles:** Add different admin permission levels (super admin, regular admin)
4. **Audit Logs:** Show detailed logs of admin actions
5. **Session Management:** View and manage active admin sessions
6. **2FA Backup Codes:** Generate and manage backup codes for MFA
7. **Admin Suspension:** Temporarily disable admin accounts
8. **Bulk Admin Creation:** Upload CSV to create multiple admins

## Notes

- Admins cannot delete other admin accounts (security feature)
- Admins cannot delete themselves
- All admin accounts require MFA for enhanced security
- Password complexity can be enhanced further if needed
- Consider implementing password expiry policies for admins

