import { useEffect, useCallback } from 'react';

interface UseUnsavedChangesOptions {
  hasUnsavedChanges: boolean;
  onSave?: () => Promise<void>;
  message?: string;
}

/**
 * Hook to warn users about unsaved changes when leaving the page
 * or navigating away. Shows browser confirmation dialog on page unload.
 */
export function useUnsavedChanges({
  hasUnsavedChanges,
  onSave,
  message = 'You have unsaved changes. Are you sure you want to leave?'
}: UseUnsavedChangesOptions) {
  
  // Handle browser navigation/refresh
  useEffect(() => {
    if (!hasUnsavedChanges) return;

    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      // Modern browsers ignore custom messages and show their own
      e.returnValue = message;
      return message;
    };

    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [hasUnsavedChanges, message]);

  // Return a function to check before programmatic navigation
  const confirmNavigation = useCallback(async (): Promise<boolean> => {
    if (!hasUnsavedChanges) return true;

    // If onSave is provided, we'll handle it in the calling component
    // This just returns whether there are unsaved changes
    return false;
  }, [hasUnsavedChanges]);

  return { confirmNavigation };
}

