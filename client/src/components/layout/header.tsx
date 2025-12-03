import { Badge } from "@/components/ui/badge";

interface HeaderProps {
  title: string;
  subtitle: string;
}

export default function Header({ title, subtitle }: HeaderProps) {
  return (
    <div>
      <header className="bg-white border-b border-gray-200/50 px-6 lg:px-8 py-5">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-semibold text-gray-900 tracking-tight">{title}</h2>
            <p className="text-sm text-gray-500 mt-1">{subtitle}</p>
          </div>
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
