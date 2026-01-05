import { useState } from "react";
import { Check, ChevronsUpDown, Plus, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { useApplicationContext } from "@/contexts/ApplicationContext";
import { UnsavedChangesDialog } from "./UnsavedChangesDialog";
import { cn } from "@/lib/utils";

const STATUS_COLORS = {
  DRAFT: "bg-gray-100 text-gray-800",
  SUBMITTED: "bg-blue-100 text-blue-800",
  UNDER_REVIEW: "bg-yellow-100 text-yellow-800",
  APPROVED: "bg-green-100 text-green-800",
  REJECTED: "bg-red-100 text-red-800",
} as const;

const STATUS_LABELS = {
  DRAFT: "Draft",
  SUBMITTED: "Submitted",
  UNDER_REVIEW: "Under Review",
  APPROVED: "Approved",
  REJECTED: "Rejected",
} as const;

interface ApplicationSwitcherProps {
  hasUnsavedChanges?: boolean;
  onGetPendingData?: () => any;
}

export function ApplicationSwitcher({ 
  hasUnsavedChanges = false,
  onGetPendingData 
}: ApplicationSwitcherProps = {}) {
  const {
    currentApplication,
    allApplications,
    isLoading,
    switchApplication,
    createNewApplication,
    getApplicationProgress,
    getApplicationDisplayName,
    saveCurrentApplicationData,
  } = useApplicationContext();

  const [open, setOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [showUnsavedDialog, setShowUnsavedDialog] = useState(false);
  const [pendingApplicationId, setPendingApplicationId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const handleSwitch = async (applicationId: string) => {
    // Check for unsaved changes
    if (hasUnsavedChanges && currentApplication && applicationId !== currentApplication.id) {
      setPendingApplicationId(applicationId);
      setShowUnsavedDialog(true);
      setOpen(false);
      return;
    }

    await switchApplication(applicationId);
    setOpen(false);
  };

  const handleSaveAndSwitch = async () => {
    if (!pendingApplicationId) return;

    setIsSaving(true);
    try {
      // Get pending form data if callback provided
      const pendingData = onGetPendingData?.();
      
      if (pendingData) {
        await saveCurrentApplicationData(pendingData);
      }

      // Now switch to the new application
      await switchApplication(pendingApplicationId);
      setShowUnsavedDialog(false);
      setPendingApplicationId(null);
    } catch (error) {
      console.error("Failed to save and switch:", error);
      // Still proceed with switch even if save fails
      if (pendingApplicationId) {
        await switchApplication(pendingApplicationId);
      }
      setShowUnsavedDialog(false);
      setPendingApplicationId(null);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDiscardAndSwitch = async () => {
    if (!pendingApplicationId) return;

    await switchApplication(pendingApplicationId);
    setShowUnsavedDialog(false);
    setPendingApplicationId(null);
  };

  const handleCreateNew = async () => {
    setIsCreating(true);
    try {
      await createNewApplication();
      setOpen(false);
    } catch (error) {
      console.error("Failed to create application:", error);
    } finally {
      setIsCreating(false);
    }
  };

  // Separate draft and completed applications
  const draftApplications = allApplications.filter(app => app.status === 'DRAFT');
  const completedApplications = allApplications.filter(app => app.status !== 'DRAFT');

  if (isLoading) {
    return (
      <Button variant="outline" disabled className="w-full sm:w-[280px] justify-between text-sm">
        <Loader2 className="h-4 w-4 animate-spin mr-2" />
        <span className="truncate">Loading...</span>
      </Button>
    );
  }

  if (!currentApplication) {
    return (
      <Button
        onClick={handleCreateNew}
        disabled={isCreating}
        className="w-full sm:w-[280px] justify-between text-sm"
      >
        {isCreating ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin mr-2" />
            <span className="truncate">Creating...</span>
          </>
        ) : (
          <>
            <Plus className="mr-2 h-4 w-4 flex-shrink-0" />
            <span className="truncate">Start New Application</span>
          </>
        )}
      </Button>
    );
  }

  const currentProgress = getApplicationProgress(currentApplication);
  const currentDisplayName = getApplicationDisplayName(currentApplication);

  return (
    <>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            aria-label="Select application"
            className="w-full sm:w-[280px] justify-between text-sm"
          >
            <div className="flex items-center gap-2 flex-1 min-w-0">
              <span className="truncate">{currentDisplayName}</span>
              <span className="text-xs text-muted-foreground flex-shrink-0">{Math.round(currentProgress)}%</span>
            </div>
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-screen sm:w-[320px] p-0" align="start">
          <Command>
            <CommandInput placeholder="Search applications..." className="h-9" />
            <CommandList className="max-h-[60vh] sm:max-h-[400px]">
              <CommandEmpty>No applications found.</CommandEmpty>

              {/* Draft Applications */}
              {draftApplications.length > 0 && (
                <CommandGroup heading="Draft Applications">
                  {draftApplications.map((app) => {
                    const progress = getApplicationProgress(app);
                    const displayName = getApplicationDisplayName(app);
                    const isSelected = currentApplication.id === app.id;

                    return (
                      <CommandItem
                        key={app.id}
                        onSelect={() => handleSwitch(app.id)}
                        className="flex flex-col items-start gap-2 p-3"
                      >
                        <div className="flex items-center justify-between w-full">
                          <div className="flex items-center gap-2 flex-1 min-w-0">
                            <Check
                              className={cn(
                                "h-4 w-4 shrink-0",
                                isSelected ? "opacity-100" : "opacity-0"
                              )}
                            />
                            <span className="truncate font-medium text-sm">{displayName}</span>
                          </div>
                          <Badge
                            variant="secondary"
                            className={cn("text-xs flex-shrink-0", STATUS_COLORS[app.status])}
                          >
                            {STATUS_LABELS[app.status]}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-2 w-full pl-6">
                          <Progress value={progress} className="h-1 flex-1" />
                          <span className="text-xs text-muted-foreground flex-shrink-0">
                            {Math.round(progress)}%
                          </span>
                        </div>
                        <span className="text-xs text-muted-foreground pl-6">
                          Updated {new Date(app.updatedAt).toLocaleDateString()}
                        </span>
                      </CommandItem>
                    );
                  })}
                </CommandGroup>
              )}

              {/* Completed Applications */}
              {completedApplications.length > 0 && (
                <>
                  {draftApplications.length > 0 && <CommandSeparator />}
                  <CommandGroup heading="Completed Applications">
                    {completedApplications.map((app) => {
                      const displayName = getApplicationDisplayName(app);
                      const isSelected = currentApplication.id === app.id;

                      return (
                        <CommandItem
                          key={app.id}
                          onSelect={() => handleSwitch(app.id)}
                          className="flex items-center justify-between p-3"
                        >
                          <div className="flex items-center gap-2 flex-1 min-w-0">
                            <Check
                              className={cn(
                                "h-4 w-4 shrink-0",
                                isSelected ? "opacity-100" : "opacity-0"
                              )}
                            />
                            <span className="truncate text-sm">{displayName}</span>
                          </div>
                          <Badge
                            variant="secondary"
                            className={cn("text-xs flex-shrink-0", STATUS_COLORS[app.status])}
                          >
                            {STATUS_LABELS[app.status]}
                          </Badge>
                        </CommandItem>
                      );
                    })}
                  </CommandGroup>
                </>
              )}

              {/* New Application Button */}
              <CommandSeparator />
              <CommandGroup>
                <CommandItem
                  onSelect={handleCreateNew}
                  disabled={isCreating}
                  className="p-3"
                >
                  {isCreating ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      <span className="text-sm">Creating application...</span>
                    </>
                  ) : (
                    <>
                      <Plus className="mr-2 h-4 w-4" />
                      <span className="text-sm">New Application</span>
                    </>
                  )}
                </CommandItem>
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>

      <UnsavedChangesDialog
        open={showUnsavedDialog}
        onOpenChange={setShowUnsavedDialog}
        onSave={handleSaveAndSwitch}
        onDiscard={handleDiscardAndSwitch}
        isSaving={isSaving}
      />
    </>
  );
}

