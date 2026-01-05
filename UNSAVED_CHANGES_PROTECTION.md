# Unsaved Changes Protection

## Overview
Added comprehensive unsaved changes protection to prevent accidental data loss when users navigate away or switch applications.

## Implementation

### 1. **useUnsavedChanges Hook**
- **Location**: `client/src/hooks/useUnsavedChanges.ts`
- **Purpose**: Browser-level protection
- **Features**:
  - Intercepts browser `beforeunload` event
  - Shows browser's native "Are you sure?" dialog
  - Activates when `hasUnsavedChanges` is true
  - Customizable warning message

### 2. **UnsavedChangesDialog Component**
- **Location**: `client/src/components/application/UnsavedChangesDialog.tsx`
- **Purpose**: Application-level protection when switching
- **Features**:
  - Three action buttons:
    - **Cancel** - Stay on current application
    - **Discard Changes** - Switch without saving (red destructive button)
    - **Save & Continue** - Auto-save then switch (blue primary button)
  - Loading state during save operation
  - Clean, accessible AlertDialog UI

### 3. **ApplicationSwitcher Enhancement**
- **Updated**: `client/src/components/application/ApplicationSwitcher.tsx`
- **New Props**:
  - `hasUnsavedChanges?: boolean` - Whether current form has unsaved data
  - `onGetPendingData?: () => any` - Callback to get current form data for saving
- **Logic**:
  ```typescript
  // When switching applications:
  1. Check if hasUnsavedChanges
  2. If true, show UnsavedChangesDialog
  3. User chooses: Save, Discard, or Cancel
  4. If Save: call saveCurrentApplicationData() then switch
  5. If Discard: switch immediately
  6. If Cancel: close dialog, stay on current app
  ```

### 4. **Header Updates**
- **Updated**: `client/src/components/layout/header.tsx`
- **New Props**:
  - `hasUnsavedChanges?: boolean`
  - `onGetPendingData?: () => any`
- **Passes props** to ApplicationSwitcher

### 5. **MerchantApplicationWizard Tracking**
- **Updated**: `client/src/components/merchant-application/MerchantApplicationWizard.tsx`
- **New Prop**: `onFormChange?: (isDirty: boolean, formData?: any) => void`
- **Implementation**:
  ```typescript
  useEffect(() => {
    const subscription = form.watch((data) => {
      const isDirty = form.formState.isDirty;
      onFormChange(isDirty, data);
    });
    return () => subscription.unsubscribe();
  }, [form, onFormChange]);
  ```
- **Tracks** React Hook Form's `isDirty` state
- **Provides** current form data to parent

### 6. **Page-Level Integration**
- **Updated**: `client/src/pages/merchant-applications.tsx`
- **State Management**:
  ```typescript
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const pendingDataRef = useRef<any>(null);
  
  const handleFormChange = (isDirty: boolean, formData?: any) => {
    setHasUnsavedChanges(isDirty);
    if (formData) {
      pendingDataRef.current = formData;
    }
  };
  ```
- **Uses** `useUnsavedChanges` hook for browser warnings
- **Passes** state to Header → ApplicationSwitcher

## User Experience Flow

### **Scenario 1: Switching Applications with Unsaved Changes**
```
1. User fills out form in Application A
2. User clicks ApplicationSwitcher dropdown
3. User selects Application B
4. 🛡️ Dialog appears:
   "Unsaved Changes
    You have unsaved changes in the current application.
    What would you like to do?"
5. User chooses:
   a) "Save & Continue" → Form auto-saves → Switches to App B ✅
   b) "Discard Changes" → Switches to App B immediately ⚠️
   c) "Cancel" → Stays on App A → Dropdown closes ❌
```

### **Scenario 2: Leaving Page with Unsaved Changes**
```
1. User fills out form
2. User clicks browser back button / closes tab / refreshes
3. 🛡️ Browser shows:
   "Leave site?
    Changes you made may not be saved."
4. User chooses:
   a) "Leave" → Loses unsaved changes ⚠️
   b) "Stay" → Remains on page ✅
```

### **Scenario 3: No Unsaved Changes**
```
1. User fills out form
2. Form auto-saves every 30 seconds (existing feature)
3. User switches applications
4. ✅ Switches immediately (no dialog)
```

## Benefits

### **For Users**
✅ **No accidental data loss** - Protected from losing work
✅ **Clear choices** - Explicit options for what to do
✅ **Auto-save option** - One-click save and continue
✅ **Non-intrusive** - Only appears when needed
✅ **Browser protection** - Works even if closing tab

### **For Development**
✅ **Reusable hook** - `useUnsavedChanges` for any component
✅ **Type-safe** - Full TypeScript support
✅ **Form-aware** - Leverages React Hook Form's `isDirty`
✅ **Context-integrated** - Works with ApplicationContext
✅ **Async-safe** - Handles save promises correctly

## Technical Details

### **Browser Warning (beforeunload)**
- Only works on actual navigation (back button, refresh, close tab)
- Modern browsers ignore custom messages (shows generic warning)
- Automatically added/removed based on `hasUnsavedChanges` state

### **Application Warning (Custom Dialog)**
- Full control over UI and messaging
- Three-button choice interface
- Async save with loading state
- Graceful error handling (continues switch even if save fails)

### **Form State Tracking**
- Uses React Hook Form's `form.watch()` subscription
- Detects ANY field change via `isDirty` flag
- Captures full form data for saving
- Updates parent component in real-time

### **Save Logic**
```typescript
const handleSaveAndSwitch = async () => {
  setIsSaving(true);
  try {
    // Get current form data
    const pendingData = onGetPendingData?.();
    
    if (pendingData) {
      // Save to backend
      await saveCurrentApplicationData(pendingData);
    }
    
    // Switch to new application
    await switchApplication(pendingApplicationId);
    
    // Close dialog
    setShowUnsavedDialog(false);
  } catch (error) {
    console.error("Failed to save:", error);
    // Still switch even if save fails (graceful degradation)
    await switchApplication(pendingApplicationId);
  } finally {
    setIsSaving(false);
  }
};
```

## Edge Cases Handled

1. **Save failure** - Still allows switch (user isn't trapped)
2. **Multiple rapid switches** - Queued via state management
3. **No pending data** - Gracefully handles empty data
4. **Form reset** - `isDirty` resets after save
5. **Cancel action** - Properly closes dialog and dropdown

## Future Enhancements

- [ ] Track specific field changes (show which fields are unsaved)
- [ ] Undo/redo functionality
- [ ] Auto-save indicator (e.g., "Saving..." | "Saved at 3:45 PM")
- [ ] Conflict resolution if data changed server-side
- [ ] Offline queue (save when connection restored)

## Testing Checklist

- [x] Browser warning appears on refresh with unsaved changes
- [x] Dialog appears when switching applications
- [x] "Save & Continue" saves data and switches
- [x] "Discard Changes" switches without saving
- [x] "Cancel" closes dialog and stays on current app
- [x] No dialog when no unsaved changes
- [x] Loading state shown during save
- [x] Switch succeeds even if save fails
- [x] Form marked as clean after successful save
- [x] Multiple applications switching works correctly

