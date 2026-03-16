import { Card, CardContent } from "@/components/ui/card";
import { LucideIcon } from "lucide-react";

interface QuickActionCardProps {
  title: string;
  description: string;
  icon: LucideIcon;
  color: "azam-blue" | "green" | "purple";
  onClick: () => void;
}

export default function QuickActionCard({ 
  title, 
  description, 
  icon: Icon, 
  color,
  onClick 
}: QuickActionCardProps) {
  const colorClasses = {
    "azam-blue": "bg-azam-blue",
    green: "bg-azam-green", 
    purple: "bg-purple-500",
  };

  return (
    <Card 
      className="cursor-pointer hover:shadow-md transition-shadow border"
      onClick={onClick}
    >
      <CardContent className="p-6">
        <div className="flex items-center space-x-4">
          <div className={`w-12 h-12 ${colorClasses[color]} rounded-lg flex items-center justify-center`}>
            <Icon className="h-6 w-6 text-white" />
          </div>
          <div>
            <h3 className="font-semibold text-azam-dark">{title}</h3>
            <p className="text-sm text-gray-600">{description}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
