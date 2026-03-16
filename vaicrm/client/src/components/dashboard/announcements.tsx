
import { useEffect, useState, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Bell, Calendar, Loader2, AlertCircle } from "lucide-react";
import { useBulletins } from "@/hooks/use-bulletin";
import { formatDate } from "@shared/utils";

export default function Announcements() {
    const [isPaused, setIsPaused] = useState(false);
    const scrollRef = useRef<HTMLDivElement>(null);

    const { data: bulletinData, isLoading, isError } = useBulletins({
        bulletinType: "",
        bulletinName: "",
        bulletinId: "",
        createdDate: "",
        status: "ACTIVE",
        userType: "",
        limit: 20,
        offSet: 0,
    });

    const bulletins = bulletinData?.bulletinDetails || [];

    // Auto-scrolling logic
    useEffect(() => {
        const scrollContainer = scrollRef.current;
        if (!scrollContainer || bulletins.length === 0) return;

        let animationFrameId: number;

        const scroll = () => {
            if (!isPaused && scrollContainer) {
                // If we've scrolled past the first set of items (halfway), reset to 0
                // We compare scrollTop to roughly half of scrollHeight because we doubled the content
                if (scrollContainer.scrollTop >= (scrollContainer.scrollHeight / 2)) {
                    scrollContainer.scrollTop = 0;
                } else {
                    scrollContainer.scrollTop += 0.5; // Adjust speed: higher is faster
                }
            }
            animationFrameId = requestAnimationFrame(scroll);
        };

        animationFrameId = requestAnimationFrame(scroll);

        return () => cancelAnimationFrame(animationFrameId);
    }, [isPaused, bulletins.length]);

    const getTypeBadgeClass = (type: string) => {
        const lower = type?.toLowerCase();
        if (lower === 'alert') return 'bg-red-100 text-red-700 hover:bg-red-200';
        if (lower === 'update') return 'bg-blue-100 text-blue-700 hover:bg-blue-200';
        if (lower === 'new' || lower === 'news') return 'bg-green-100 text-green-700 hover:bg-green-200';
        if (lower === 'maintenance') return 'bg-orange-100 text-orange-700 hover:bg-orange-200';
        if (lower === 'product') return 'bg-purple-100 text-purple-700 hover:bg-purple-200';
        if (lower === 'service') return 'bg-teal-100 text-teal-700 hover:bg-teal-200';
        return 'bg-gray-100 text-gray-700 hover:bg-gray-200';
    };

    return (
        <Card className="lg:col-span-2 border-0 shadow-lg h-full flex flex-col">
            <CardHeader className="pb-4 flex-shrink-0">
                <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                        <Bell className="w-5 h-5 text-blue-600" />
                        <CardTitle className="text-lg font-semibold text-gray-900">Announcements</CardTitle>
                    </div>
                    <Badge variant="outline" className="text-xs font-normal">
                        {bulletins.length} Updates
                    </Badge>
                </div>
            </CardHeader>
            <CardContent className="relative flex-1 min-h-[300px] overflow-hidden p-0"
                onMouseEnter={() => setIsPaused(true)}
                onMouseLeave={() => setIsPaused(false)}>

                {isLoading ? (
                    <div className="flex items-center justify-center h-[300px]">
                        <Loader2 className="h-6 w-6 animate-spin text-blue-500" />
                        <span className="ml-2 text-sm text-gray-500 font-medium">Loading announcements...</span>
                    </div>
                ) : isError ? (
                    <div className="flex flex-col items-center justify-center h-[300px] text-gray-400">
                        <AlertCircle className="h-8 w-8 mb-2" />
                        <p className="text-sm font-medium">Failed to load announcements</p>
                    </div>
                ) : bulletins.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-[300px] text-gray-400">
                        <Bell className="h-8 w-8 mb-2" />
                        <p className="text-sm font-medium">No announcements available</p>
                    </div>
                ) : (
                    <div
                        ref={scrollRef}
                        className="h-[300px] overflow-y-auto px-6 pb-6 space-y-4 no-scrollbar"
                        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
                    >
                        {/* Render list twice for seamless loop only when enough items */}
                        {(bulletins.length > 3 ? [...bulletins, ...bulletins] : bulletins).map((item, index) => (
                            <div key={`${item.objId}-${index}`} className="group p-4 rounded-xl bg-gray-50 border border-gray-100 hover:bg-blue-50 hover:border-blue-100 transition-all duration-300">
                                <div className="flex items-start justify-between mb-2">
                                    <Badge className={`${getTypeBadgeClass(item.type)} border-0 bg-opacity-50`}>
                                        {item.type?.toUpperCase()}
                                    </Badge>
                                    <div className="flex items-center text-xs text-gray-500">
                                        <Calendar className="w-3 h-3 mr-1" />
                                        {formatDate(item.createdDate)}
                                    </div>
                                </div>
                                <h4 className="font-semibold text-gray-900 mb-1 group-hover:text-blue-700 transition-colors">
                                    {item.title}
                                </h4>
                                <p className="text-sm text-gray-600 line-clamp-2">
                                    {item.bulletinText}
                                </p>
                            </div>
                        ))}
                    </div>
                )}

                {/* Gradient overlay for smooth fade out at bottom */}
                <div className="absolute bottom-0 left-0 right-0 h-12 bg-gradient-to-t from-white to-transparent pointer-events-none"></div>
            </CardContent>
        </Card>
    );
}
