# Admin Delete Functionality - Quick Guide

## How to Use Delete Features

### 1. Delete a User
**Location:** Admin Dashboard → Company Overview

1. Find the user/company in the list
2. Click the **trash icon** (🗑️) next to their status badge
3. Review the confirmation dialog showing:
   - User name and email
   - User role
   - Company name
   - Warning about data deletion
4. Click **"Delete User"** to confirm or **"Cancel"** to abort
5. User and all associated data will be permanently deleted

**What gets deleted:**
- User account
- Client record
- All documents
- Audit logs remain for compliance

---

### 2. Delete an Invitation Code
**Location:** Admin Dashboard → Invitation Codes section

1. Find the invitation code in the table
2. Click the **trash icon** (🗑️) in the Actions column
3. Review the confirmation dialog showing:
   - Code value (e.g., INV-ABC123)
   - Who it's for (label)
   - Current status (ACTIVE/USED/EXPIRED)
4. Click **"Delete"** to confirm or **"Cancel"** to abort
5. Code will be permanently removed

**Notes:**
- You can delete codes in any status (ACTIVE, USED, or EXPIRED)
- The copy button only works for ACTIVE codes
- Deletion is permanent and cannot be undone

---

### 3. Delete a Merchant Application
**Location:** Admin Dashboard → Merchant Applications section

1. Find the application in the list
2. Click the **trash icon** (🗑️) next to the Review button
3. Review the confirmation dialog showing:
   - Business name
   - Application status
   - Contact email
   - ⚠️ **Warning** if not a draft
4. Click **"Delete Application"** to confirm or **"Cancel"** to abort
5. Application will be permanently deleted

**Permission Levels:**
- **Clients:** Can only delete their own DRAFT applications
- **Admins:** Can delete ANY application regardless of status

**Warning for Non-Draft Applications:**
The system will show a special warning when deleting submitted, approved, or rejected applications, as this may affect business records.

---

## Safety Features

✅ **Confirmation Required:** Every delete action requires explicit confirmation

✅ **Detailed Information:** Dialogs show exactly what will be deleted

✅ **Audit Logging:** All admin deletions are logged for compliance

✅ **Immediate Feedback:** Success/error messages appear after each action

✅ **Visual Cues:** Red color scheme indicates destructive actions

---

## What You Cannot Undo

⚠️ **All deletions are permanent and cannot be reversed.**

Before deleting:
- Make sure you have the correct item
- Read the confirmation dialog carefully
- Consider if you need to export/save any data first
- Check if there are related records you need to preserve

---

## Common Questions

**Q: Can I recover deleted data?**
A: No, all deletions are permanent. Make sure you want to delete before confirming.

**Q: Will deleting a user affect their merchant applications?**
A: Yes, deleting a user will cascade delete their client record, documents, and applications.

**Q: Can I see who deleted what?**
A: Yes, all deletions are logged in the audit logs with admin user ID, timestamp, and details.

**Q: Why can't I delete a submitted application as a client?**
A: For data integrity, clients can only delete draft applications. Contact an admin if you need to delete a submitted application.

**Q: What happens to documents when I delete an application?**
A: Documents remain in the system unless you separately delete the user/client.

---

## Need Help?

If you need to:
- Recover accidentally deleted data → Not possible, deletions are permanent
- Delete multiple items at once → Currently must delete individually
- Export data before deletion → Use the existing export features first
- Restrict deletion permissions → Contact system administrator

---

## Related Documentation

- Full technical details: See `ADMIN_DELETE_FUNCTIONALITY.md`
- Database migration: See `migrations/014_add_delete_audit_actions.sql`
- Audit logs: Access via Admin Dashboard → Audit Logs section
