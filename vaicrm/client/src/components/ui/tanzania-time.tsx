import { useState, useEffect } from "react";
import { Clock } from "lucide-react";

export default function TanzaniaTime() {
  const [currentTime, setCurrentTime] = useState<Date>(new Date());

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  // Format time for Tanzania (UTC+3) with seconds and AM/PM
  const formatTanzaniaTime = (date: Date) => {
    return new Intl.DateTimeFormat('en-US', {
      timeZone: 'Africa/Dar_es_Salaam',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: true
    }).format(date);
  };

  // Format date for Tanzania with full year
  const formatTanzaniaDate = (date: Date) => {
    return new Intl.DateTimeFormat('en-US', {
      timeZone: 'Africa/Dar_es_Salaam',
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    }).format(date);
  };

  return (
    <div className="hidden lg:flex items-center space-x-2 text-white hover:bg-azam-header-light px-2 py-1 rounded transition-all duration-200 cursor-default">
      <div className="w-6 h-6 bg-azam-orange/20 rounded-full flex items-center justify-center border border-azam-orange/30">
        <Clock className="h-3.5 w-3.5 text-azam-orange" />
      </div>
      <div className="flex flex-col">
        <span className="text-xs font-medium leading-tight text-white">{formatTanzaniaTime(currentTime)}</span>
        <span className="text-xs text-white/70 leading-tight">{formatTanzaniaDate(currentTime)}</span>
      </div>
    </div>
  );
}