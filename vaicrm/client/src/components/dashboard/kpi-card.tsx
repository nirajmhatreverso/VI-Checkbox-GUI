import { Card, CardContent } from "@/components/ui/card";
import { LucideIcon } from "lucide-react";

interface KPICardProps {
  title: string;
  value: string | number;
  change?: string;
  changeType?: "positive" | "negative" | "neutral";
  icon: LucideIcon;
  color: "azam-blue" | "green" | "yellow" | "red";
}

export default function KPICard({ 
  title, 
  value, 
  change, 
  changeType = "neutral", 
  icon: Icon, 
  color 
}: KPICardProps) {
  const changeColors = {
    positive: "text-azam-green",
    negative: "text-azam-red",
    neutral: "text-yellow-600",
  };

  const iconBgColors = {
    "azam-blue": "bg-azam-blue-light",
    green: "bg-green-100", 
    yellow: "bg-yellow-100",
    red: "bg-red-100",
  };

  const iconColors = {
    "azam-blue": "text-azam-blue",
    green: "text-azam-green",
    yellow: "text-yellow-500",
    red: "text-azam-red",
  };

  return (
    <Card className={`kpi-card ${color}`}>
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-600">{title}</p>
            <p className="text-3xl font-bold text-azam-dark">{value}</p>
            {change && (
              <p className={`text-sm mt-1 ${changeColors[changeType]}`}>
                {change}
              </p>
            )}
          </div>
          <div className={`w-12 h-12 ${iconBgColors[color]} rounded-lg flex items-center justify-center`}>
            <Icon className={`h-6 w-6 ${iconColors[color]}`} />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
