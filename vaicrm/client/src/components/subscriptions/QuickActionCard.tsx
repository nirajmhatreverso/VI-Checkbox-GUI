import { Card, CardContent } from "@/components/ui/card";
import { ChevronRight } from "lucide-react";
import type { QuickActionProps } from "@/types/subscriber";

export default function QuickActionCard({ 
  icon: Icon, 
  title, 
  description, 
  onClick, 
  color = "azam-blue", 
  count, 
  disabled = false 
}: QuickActionProps & { disabled?: boolean }) {
  return (
    <Card className={`transition-all cursor-pointer hover:scale-[1.02] group border-l-4 border-l-azam-blue ${
      disabled ? 'opacity-50 cursor-not-allowed' : 'hover:shadow-lg'
    }`} onClick={disabled ? undefined : onClick}>
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className={`p-2 rounded-lg ${disabled ? 'bg-gray-100' : 'bg-azam-blue-light group-hover:bg-azam-blue group-hover:text-white'} transition-colors`}>
              <Icon className={`h-5 w-5 ${disabled ? 'text-gray-400' : 'text-azam-blue group-hover:text-white'}`} />
            </div>
            <div>
              <h3 className={`font-semibold text-sm ${disabled ? 'text-gray-400' : 'text-gray-900 group-hover:text-azam-blue'} transition-colors`}>
                {title}
              </h3>
              <p className={`text-xs ${disabled ? 'text-gray-400' : 'text-gray-600'}`}>{description}</p>
            </div>
          </div>
          {count !== undefined && (
            <div className="text-right">
              <div className={`text-lg font-bold ${disabled ? 'text-gray-400' : 'text-azam-blue'}`}>{count}</div>
              <div className="text-xs text-gray-500">records</div>
            </div>
          )}
          <ChevronRight className={`h-4 w-4 ${disabled ? 'text-gray-300' : 'text-gray-400 group-hover:text-azam-blue'} transition-colors`} />
        </div>
      </CardContent>
    </Card>
  );
}