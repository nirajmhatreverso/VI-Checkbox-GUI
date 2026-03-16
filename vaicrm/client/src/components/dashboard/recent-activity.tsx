import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface ActivityItem {
  id: string;
  title: string;
  subtitle: string;
  time: string;
  type: "success" | "warning" | "error";
}

interface RecentActivityProps {
  title: string;
  items: ActivityItem[];
}

export default function RecentActivity({ title, items }: RecentActivityProps) {
  const getIconClasses = (type: ActivityItem["type"]) => {
    switch (type) {
      case "success":
        return "bg-azam-green text-white";
      case "warning":
        return "bg-yellow-500 text-white";
      case "error":
        return "bg-azam-red text-white";
      default:
        return "bg-azam-blue text-white";
    }
  };

  const getBadgeClasses = (type: ActivityItem["type"]) => {
    switch (type) {
      case "success":
        return "status-badge good";
      case "warning":
        return "status-badge low";
      case "error":
        return "status-badge critical";
      default:
        return "status-badge active";
    }
  };

  const getIcon = (type: ActivityItem["type"]) => {
    switch (type) {
      case "success":
        return "✓";
      case "warning":
        return "!";
      case "error":
        return "✕";
      default:
        return "✓";
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg font-semibold text-azam-dark">
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {items.length === 0 ? (
            <p className="text-gray-500 text-center py-4">No recent activity</p>
          ) : (
            items.map((item) => (
              <div
                key={item.id}
                className="flex items-center justify-between py-3 border-b border-gray-100 last:border-b-0"
              >
                <div className="flex items-center space-x-3">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs ${getIconClasses(item.type)}`}>
                    {getIcon(item.type)}
                  </div>
                  <div>
                    <p className="font-medium text-azam-dark">{item.title}</p>
                    <p className="text-sm text-gray-600">{item.subtitle}</p>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <span className="text-sm text-gray-500">{item.time}</span>
                  {item.type !== "success" && (
                    <Badge className={getBadgeClasses(item.type)}>
                      {item.type}
                    </Badge>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
}
