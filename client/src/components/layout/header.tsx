import { Badge } from "@/components/ui/badge";
import { ApplicationSwitcher } from "@/components/application/ApplicationSwitcher";
import { useAuth } from "@/hooks/useAuth";

interface HeaderProps {
  title: string;
  subtitle: string;
  showApplicationSwitcher?: boolean;
  hasUnsavedChanges?: boolean;
  onGetPendingData?: () => any;
}

export default function Header({ 
  title, 
  subtitle, 
  showApplicationSwitcher = false,
  hasUnsavedChanges = false,
  onGetPendingData
}: HeaderProps) {
  const { user } = useAuth();
  const isClient = user?.role === 'CLIENT';

  return (
    <div>
      <header className="bg-white border-b border-gray-200/50 px-6 lg:px-8 py-5">
        <div className="flex items-center justify-between gap-4">
          {/* Left side: Application switcher (if enabled) or title */}
          <div className="flex items-center gap-4 min-w-0 flex-1">
            {showApplicationSwitcher && isClient && (
              <ApplicationSwitcher 
                hasUnsavedChanges={hasUnsavedChanges}
                onGetPendingData={onGetPendingData}
              />
            )}
            <div className="min-w-0">
              <h2 className="text-2xl font-semibold text-gray-900 tracking-tight truncate">{title}</h2>
              <p className="text-sm text-gray-500 mt-1 truncate">{subtitle}</p>
            </div>
          </div>
          
          {/* Right side: Status badge */}
          <div className="flex items-center space-x-4">
            <Badge variant="secondary" className="bg-[#10B981]/10 text-[#10B981] border-[#10B981]/20 font-medium">
              <div className="w-2 h-2 bg-[#10B981] rounded-full mr-2"></div>
              Active
            </Badge>
          </div>
        </div>
      </header>
    </div>
  );
}
