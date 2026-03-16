import { LucideIcon } from "lucide-react";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";

interface DigitalKPIProps {
  title: string;
  value: string | number;
  previousValue?: string | number;
  icon: LucideIcon;
  color: "azam-blue" | "green" | "red" | "yellow" | "purple";
  format?: "number" | "currency" | "percentage";
  animate?: boolean;
  subtitle?: string;
}

const colorClasses = {
  "azam-blue": {
    bg: "bg-azam-blue-light",
    icon: "text-azam-blue",
    text: "text-azam-blue",
    accent: "bg-azam-blue"
  },
  green: {
    bg: "bg-green-50",
    icon: "text-green-600", 
    text: "text-green-600",
    accent: "bg-green-600"
  },
  red: {
    bg: "bg-red-50",
    icon: "text-red-600",
    text: "text-red-600", 
    accent: "bg-red-600"
  },
  yellow: {
    bg: "bg-yellow-50",
    icon: "text-yellow-600",
    text: "text-yellow-600",
    accent: "bg-yellow-600"
  },
  purple: {
    bg: "bg-purple-50",
    icon: "text-purple-600",
    text: "text-purple-600",
    accent: "bg-purple-600"
  }
};

export default function DigitalKPI({
  title,
  value,
  previousValue,
  icon: Icon,
  color,
  format = "number",
  animate = true,
  subtitle
}: DigitalKPIProps) {
  const formatValue = (val: string | number) => {
    if (typeof val === "string") return val;
    
    switch (format) {
      case "currency":
        return new Intl.NumberFormat('en-TZ', {
          style: 'currency',
          currency: 'TZS',
          minimumFractionDigits: 0,
          maximumFractionDigits: 0
        }).format(val);
      case "percentage":
        return `${val}%`;
      default:
        return val.toLocaleString();
    }
  };

  const calculateChange = () => {
    if (!previousValue || typeof value !== "number" || typeof previousValue !== "number") {
      return null;
    }
    
    const change = ((value - previousValue) / previousValue) * 100;
    return {
      value: Math.abs(change),
      direction: change > 0 ? "up" : change < 0 ? "down" : "same"
    };
  };

  const change = calculateChange();
  const classes = colorClasses[color];

  return (
    <div className={`${classes.bg} rounded-xl p-6 border border-gray-100 relative overflow-hidden`}>
      {/* Accent line */}
      <div className={`absolute top-0 left-0 right-0 h-1 ${classes.accent}`} />
      
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center space-x-2 mb-2">
            <Icon className={`h-5 w-5 ${classes.icon}`} />
            <h3 className="text-sm font-medium text-gray-600">{title}</h3>
          </div>
          
          <div className="space-y-1">
            <div className={`text-2xl font-bold ${classes.text} ${animate ? 'animate-pulse' : ''}`}>
              {formatValue(value)}
            </div>
            
            {subtitle && (
              <p className="text-xs text-gray-500">{subtitle}</p>
            )}
            
            {change && (
              <div className="flex items-center space-x-1">
                {change.direction === "up" && <TrendingUp className="h-3 w-3 text-green-500" />}
                {change.direction === "down" && <TrendingDown className="h-3 w-3 text-red-500" />}
                {change.direction === "same" && <Minus className="h-3 w-3 text-gray-500" />}
                <span className={`text-xs font-medium ${
                  change.direction === "up" ? "text-green-600" : 
                  change.direction === "down" ? "text-red-600" : "text-gray-600"
                }`}>
                  {change.value.toFixed(1)}% vs last period
                </span>
              </div>
            )}
          </div>
        </div>
        
        {/* Digital indicator */}
        <div className="flex flex-col items-end space-y-2">
          <div className="w-2 h-8 bg-gradient-to-t from-gray-200 to-gray-400 rounded-full relative">
            <div 
              className={`absolute bottom-0 left-0 right-0 ${classes.accent} rounded-full transition-all duration-1000`}
              style={{ height: `${Math.min(100, Math.max(10, typeof value === "number" ? (value % 100) : 50))}%` }}
            />
          </div>
          <div className="w-1 h-1 bg-green-400 rounded-full animate-pulse" />
        </div>
      </div>
    </div>
  );
}