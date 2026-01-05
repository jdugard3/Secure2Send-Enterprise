# Global Application Switcher Implementation

## Overview
This feature introduces a global application context and dropdown switcher that allows users to manage multiple merchant applications seamlessly. The switcher provides a single, consistent interface for selecting and creating applications across the entire platform.

## Key Features Implemented

### 1. **ApplicationContext Provider**
- **Location**: `client/src/contexts/ApplicationContext.tsx`
- **Purpose**: Global state management for merchant applications
- **Features**:
  - Tracks current application across all pages
  - Manages URL state synchronization (`?applicationId=...`)
  - Auto-loads applications on mount
  - Provides utility functions for progress calculation and display names
  - Implements auto-save before switching applications

### 2. **Global Application Switcher**
- **Location**: `client/src/components/application/ApplicationSwitcher.tsx`
- **Features**:
  - Dropdown showing all applications with search
  - Visual progress bars for each application (25%, 50%, 75%, 100%)
  - Status badges (Draft, Submitted, Under Review, Approved, Rejected)
  - Separate sections for draft vs completed applications
  - "+ New Application" option at bottom
  - Fully responsive (mobile-optimized with full-width popover)
  - Last updated timestamp for each application

### 3. **Updated Pages**

#### **Home Page** (`client/src/pages/home.tsx`)
- Shows application switcher in header
- Displays current application progress overview
- Shows current step with visual indicators
- Quick action button to continue current step
- Empty state when no application selected
- 4-step progress visualization

#### **Merchant Applications Page** (`client/src/pages/merchant-applications.tsx`)
- Simplified to show only the wizard for current application
- Removed redundant application list (now in switcher)
- Application switcher in header for easy navigation
- Focused on completing the current application

#### **Documents Page** (`client/src/pages/documents.tsx`)
- Filters documents by current application
- Shows application name in subtitle
- Document statistics specific to current application
- Upload interface tied to current application
- Tabbed view for document statuses

### 4. **Header Updates**
- **Location**: `client/src/components/layout/header.tsx`
- Added `showApplicationSwitcher` prop
- Switcher appears on left side for CLIENT role users
- Responsive layout that works on mobile and desktop

### 5. **App-Level Integration**
- **Location**: `client/src/App.tsx`
- Wrapped entire app in `ApplicationProvider`
- All authenticated pages have access to application context

## User Experience Flow

### **New User Flow**
1. User logs in → Lands on home page
2. Home shows empty state: "Start Your Merchant Application"
3. Clicks switcher → "+ New Application" option
4. New draft created with date-based name
5. Begins Step 1: Basic Info
6. After Step 1, application renamed to business name
7. Progress bar updates as steps are completed

### **Existing User Flow**
1. User logs in → Lands on home with current application selected
2. Home shows progress overview and current step
3. Can switch applications via global dropdown
4. Auto-save triggers when switching applications
5. All pages (home, documents, application wizard) update to new context
6. Progress bar and data specific to selected application

### **Multiple Applications**
1. User can create multiple applications
2. Dropdown shows all applications with:
   - Application name (business name or date-based)
   - Progress percentage
   - Status badge
   - Last updated date
3. Quick search/filter in dropdown
4. One-click switching between applications
5. URL updates to reflect current application

## Technical Implementation

### **URL State Management**
- URL param: `?applicationId={id}`
- Synced bidirectionally with context state
- Updates on application switch
- Preserved on page navigation
- Enables deep linking and bookmarking

### **Auto-Save on Switch**
- When switching applications, pending form data is saved
- Async save completes before switch
- Graceful error handling (continues switch even if save fails)
- Query cache invalidation for fresh data

### **Progress Calculation**
```typescript
const progress = (currentStep / 4) * 100;
// Step 1 = 25%, Step 2 = 50%, Step 3 = 75%, Step 4 = 100%
```

### **Display Name Logic**
```typescript
Priority:
1. dbaBusinessName (if not date-based)
2. legalBusinessName (if not date-based)
3. Date-based fallback: "Application - Jan 15, 2025"
```

## Mobile Optimization

### **Responsive Switcher**
- Button width: `w-full sm:w-[280px]`
- Popover width: `w-screen sm:w-[320px]`
- Max height: `max-h-[60vh] sm:max-h-[400px]`
- Touch-friendly tap targets (p-3)
- Truncated text with proper overflow handling
- Flex-shrink-0 on icons and badges

### **Mobile Header Layout**
- Switcher stacks with title on small screens
- Flexible gap spacing
- Truncation prevents layout breaking

## Benefits

### **For Users**
✅ **No confusion** - Always know which application is active
✅ **Fast switching** - One click to change context
✅ **Progress visibility** - See completion status at a glance
✅ **Less navigation** - No need to return to home to switch apps
✅ **Consistent UX** - Same switcher everywhere in the app

### **For Development**
✅ **Single source of truth** - ApplicationContext manages state
✅ **Simplified pages** - No local application selection logic
✅ **Reusable component** - ApplicationSwitcher used everywhere
✅ **Type-safe** - Full TypeScript support
✅ **Testable** - Context can be mocked for testing

## Files Modified
- `client/src/App.tsx` - Added ApplicationProvider
- `client/src/contexts/ApplicationContext.tsx` - New context provider
- `client/src/components/application/ApplicationSwitcher.tsx` - New switcher component
- `client/src/components/layout/header.tsx` - Added switcher integration
- `client/src/pages/home.tsx` - Complete redesign with context
- `client/src/pages/merchant-applications.tsx` - Simplified with context
- `client/src/pages/documents.tsx` - Context-aware document filtering

## Files Backed Up
- `client/src/pages/home-old.tsx` - Original home page
- `client/src/pages/merchant-applications-old.tsx` - Original applications page
- `client/src/pages/documents-old.tsx` - Original documents page

## Future Enhancements

### **Phase 3 (Optional)**
- Keyboard shortcut (Cmd/Ctrl + K) to open switcher
- Recent applications quick access
- Duplicate application feature
- Bulk delete for drafts
- Export application as PDF from switcher
- Application templates

## Breaking Changes
⚠️ **None** - This is an additive feature. Old URLs without `applicationId` param still work and auto-select first draft application.

## Testing Checklist
- [ ] Create new application via switcher
- [ ] Switch between multiple applications
- [ ] Verify URL updates on switch
- [ ] Verify documents filter by application
- [ ] Verify progress calculation accurate
- [ ] Verify mobile responsive layout
- [ ] Verify search in switcher works
- [ ] Verify auto-save on switch
- [ ] Verify deep linking with `?applicationId=...`
- [ ] Verify empty state when no applications

## Migration Notes
No database migrations required. Uses existing `merchant_applications` table structure.

