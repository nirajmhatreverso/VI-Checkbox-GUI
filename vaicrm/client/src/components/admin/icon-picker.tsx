import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Search } from "lucide-react";

// Common PrimeIcons - add more as needed
const PRIME_ICONS = [
    "pi pi-home",
    "pi pi-box",
    "pi pi-wallet",
    "pi pi-users",
    "pi pi-user",
    "pi pi-chart-bar",
    "pi pi-chart-line",
    "pi pi-chart-pie",
    "pi pi-send",
    "pi pi-check-circle",
    "pi pi-times-circle",
    "pi pi-exclamation-triangle",
    "pi pi-info-circle",
    "pi pi-cog",
    "pi pi-sitemap",
    "pi pi-shield",
    "pi pi-lock",
    "pi pi-unlock",
    "pi pi-key",
    "pi pi-calendar",
    "pi pi-clock",
    "pi pi-bell",
    "pi pi-envelope",
    "pi pi-phone",
    "pi pi-map-marker",
    "pi pi-globe",
    "pi pi-search",
    "pi pi-filter",
    "pi pi-download",
    "pi pi-upload",
    "pi pi-file",
    "pi pi-folder",
    "pi pi-folder-open",
    "pi pi-trash",
    "pi pi-pencil",
    "pi pi-plus",
    "pi pi-minus",
    "pi pi-times",
    "pi pi-check",
    "pi pi-chevron-left",
    "pi pi-chevron-right",
    "pi pi-chevron-up",
    "pi pi-chevron-down",
    "pi pi-arrow-left",
    "pi pi-arrow-right",
    "pi pi-arrow-up",
    "pi pi-arrow-down",
    "pi pi-refresh",
    "pi pi-sync",
    "pi pi-replay",
    "pi pi-undo",
    "pi pi-save",
    "pi pi-print",
    "pi pi-copy",
    "pi pi-clone",
    "pi pi-share-alt",
    "pi pi-external-link",
    "pi pi-link",
    "pi pi-bookmark",
    "pi pi-star",
    "pi pi-heart",
    "pi pi-thumbs-up",
    "pi pi-thumbs-down",
    "pi pi-comment",
    "pi pi-comments",
    "pi pi-image",
    "pi pi-video",
    "pi pi-camera",
    "pi pi-play",
    "pi pi-pause",
    "pi pi-stop",
    "pi pi-volume-up",
    "pi pi-volume-down",
    "pi pi-volume-off",
    "pi pi-wifi",
    "pi pi-bluetooth",
    "pi pi-database",
    "pi pi-server",
    "pi pi-desktop",
    "pi pi-mobile",
    "pi pi-tablet",
    "pi pi-shopping-cart",
    "pi pi-shopping-bag",
    "pi pi-credit-card",
    "pi pi-money-bill",
    "pi pi-dollar",
    "pi pi-percentage",
    "pi pi-tag",
    "pi pi-tags",
    "pi pi-briefcase",
    "pi pi-building",
    "pi pi-warehouse",
    "pi pi-truck",
    "pi pi-car",
    "pi pi-plane",
    "pi pi-compass",
    "pi pi-flag",
    "pi pi-gift",
    "pi pi-ticket",
    "pi pi-qrcode",
    "pi pi-barcode",
    "pi pi-id-card",
    "pi pi-palette",
    "pi pi-sliders-h",
    "pi pi-sliders-v",
    "pi pi-list",
    "pi pi-th-large",
    "pi pi-table",
    "pi pi-sort",
    "pi pi-sort-up",
    "pi pi-sort-down",
    "pi pi-sort-alpha-down",
    "pi pi-sort-alpha-up",
    "pi pi-sort-numeric-down",
    "pi pi-sort-numeric-up",
    "pi pi-eye",
    "pi pi-eye-slash",
    "pi pi-power-off",
    "pi pi-sign-in",
    "pi pi-sign-out",
    "pi pi-spinner",
    "pi pi-sun",
    "pi pi-moon",
    "pi pi-cloud",
    "pi pi-cloud-upload",
    "pi pi-cloud-download",
];

interface IconPickerProps {
    value: string;
    onChange: (value: string) => void;
    disabled?: boolean;
}

export function IconPicker({ value, onChange, disabled }: IconPickerProps) {
    const [open, setOpen] = useState(false);
    const [search, setSearch] = useState("");

    const filteredIcons = PRIME_ICONS.filter((icon) =>
        icon.toLowerCase().includes(search.toLowerCase())
    );

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <Button
                    variant="outline"
                    className="w-full justify-start"
                    disabled={disabled}
                >
                    <i className={`${value || "pi pi-question"} mr-2`} />
                    {value || "Select icon..."}
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[400px] p-0" align="start">
                <div className="p-3 border-b">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <Input
                            placeholder="Search icons..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="pl-10"
                        />
                    </div>
                </div>
                <ScrollArea className="h-[300px]">
                    <div className="grid grid-cols-6 gap-2 p-3">
                        {filteredIcons.map((icon) => (
                            <button
                                key={icon}
                                type="button"
                                onClick={() => {
                                    onChange(icon);
                                    setOpen(false);
                                }}
                                className={`p-3 rounded-lg border-2 transition-all hover:bg-blue-50 hover:border-azam-blue flex items-center justify-center ${value === icon
                                    ? "bg-blue-100 border-azam-blue"
                                    : "border-slate-200"
                                    }`}
                                title={icon}
                            >
                                <i className={`${icon} text-xl text-slate-700`} />
                            </button>
                        ))}
                    </div>
                    {filteredIcons.length === 0 && (
                        <div className="p-8 text-center text-slate-500">
                            No icons found matching "{search}"
                        </div>
                    )}
                </ScrollArea>
                <div className="p-3 border-t bg-slate-50 text-xs text-slate-600">
                    <div className="flex items-center justify-between">
                        <span>{filteredIcons.length} icons available</span>
                        <a
                            href="https://primereact.org/icons"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-azam-blue hover:underline"
                        >
                            View all PrimeIcons →
                        </a>
                    </div>
                </div>
            </PopoverContent>
        </Popover>
    );
}
