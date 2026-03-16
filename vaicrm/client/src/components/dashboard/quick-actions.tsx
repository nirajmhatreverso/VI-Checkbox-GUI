// src/components/dashboard/quick-actions.tsx

import { useState, useEffect, useMemo } from "react";
import { useLocation } from "wouter";
import {
    Users, DollarSign, BarChart3, Package, Monitor, Settings,
    Shield, Bell, Edit, Save, User, CreditCard, Plus, CheckCircle,
    Briefcase, Truck, Search, IdCard, Link2, MessageSquare, Network,
    UserPlus, Home, Sliders, Copy, Percent, Cog, List, FileText,
    ArrowRightLeft, Box, LucideIcon, AlertTriangle, Clock, Lock,
    FileCheck, RefreshCw
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
    Dialog, 
    DialogContent, 
    DialogHeader, 
    DialogTitle, 
    DialogFooter, 
    DialogDescription 
} from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "@/hooks/use-toast";
import { useAuthContext } from "@/context/AuthProvider";

// ============================================================================
// ICON MAPPING: PrimeReact icons to Lucide icons
// ============================================================================
const ICON_MAP: Record<string, LucideIcon> = {
    "pi pi-users": Users,
    "pi pi-user": User,
    "pi pi-user-plus": UserPlus,
    "pi pi-box": Box,
    "pi pi-credit-card": CreditCard,
    "pi pi-plus": Plus,
    "pi pi-check": CheckCircle,
    "pi pi-shield": Shield,
    "pi pi-briefcase": Briefcase,
    "pi pi-truck": Truck,
    "pi pi-search": Search,
    "pi pi-id-card": IdCard,
    "pi pi-link": Link2,
    "pi pi-comments": MessageSquare,
    "pi pi-sitemap": Network,
    "pi pi-home": Home,
    "pi pi-dollar": DollarSign,
    "pi pi-sliders-h": Sliders,
    "pi pi-clone": Copy,
    "pi pi-percentage": Percent,
    "pi pi-cog": Cog,
    "pi pi-chart-bar": BarChart3,
    "pi pi-list": List,
    "pi pi-file": FileText,
    "pi pi-bell": Bell,
    "pi pi-arrow-right-arrow-left": ArrowRightLeft,
    "pi pi-exclamation-triangle": AlertTriangle,
    "pi pi-clock": Clock,
    "pi pi-lock": Lock,
    "pi pi-check-square": FileCheck,
    "pi pi-refresh": RefreshCw,
};

// ============================================================================
// COLOR MAPPING: Section-based colors for visual distinction
// ============================================================================
const SECTION_COLORS: Record<string, string> = {
    "Onboarding": "bg-blue-500",
    "Inventory": "bg-orange-500",
    "Payments": "bg-green-500",
    "Service Ticketing": "bg-teal-500",
    "Admin": "bg-purple-500",
    "Reports": "bg-indigo-500",
    "Dashboard": "bg-cyan-500",
    "Adjustment": "bg-amber-500",
    "Subscriptions": "bg-emerald-500",
    "Bulk Provision": "bg-rose-500",
    "Agent Commission": "bg-violet-500",
    "Provisioning": "bg-slate-500",
    "Navigation": "bg-gray-600", // For NAV items without SECTION
};

const DEFAULT_COLOR = "bg-gray-500";

// ============================================================================
// INTERFACES
// ============================================================================
interface QuickAction {
    id: string;
    title: string;
    subtitle: string;
    icon: LucideIcon;
    path: string;
    color: string;
    sectionName: string;
    order: number;
    source: "SECTION" | "NAV"; // Track where the action came from
}

interface MenuItem {
    menuType: string;
    pageSectionName: string | null;
    pageMenu: string;
    pageMenuLabel: string | null;
    pageMenuIcon: string;
    pageUrl: string;
    pageMenuOrder: number;
    subMenus: any[];
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Transforms menu items from API response into QuickAction objects
 */
const transformMenuItems = (
    sections: MenuItem[], 
    navItems: MenuItem[]
): QuickAction[] => {
    const quickActions: QuickAction[] = [];
    const addedPaths = new Set<string>();

    // First, add all SECTION items (these are the primary quick actions)
    sections.forEach((section) => {
        const iconKey = section.pageMenuIcon || "pi pi-cog";
        const Icon = ICON_MAP[iconKey] || Settings;
        const sectionName = section.pageSectionName || "General";
        const color = SECTION_COLORS[sectionName] || DEFAULT_COLOR;

        quickActions.push({
            id: section.pageUrl,
            title: section.pageMenu,
            subtitle: section.pageMenuLabel || sectionName,
            icon: Icon,
            path: section.pageUrl,
            color: color,
            sectionName: sectionName,
            order: section.pageMenuOrder,
            source: "SECTION",
        });
        addedPaths.add(section.pageUrl);
    });

    // Then, add NAV items that don't have corresponding SECTION entries
    // (excluding Dashboard as it's always accessible)
    navItems.forEach((navItem) => {
        // Skip if already added from SECTION or if it's the Dashboard
        if (addedPaths.has(navItem.pageUrl) || navItem.pageUrl === "/dashboard") {
            return;
        }

        // Check if there's ANY section entry for this nav item's section
        const hasSectionEntry = sections.some(
            (s) => s.pageSectionName === navItem.pageMenu
        );

        // If nav item has no corresponding sections, add it as a quick action
        if (!hasSectionEntry) {
            const iconKey = navItem.pageMenuIcon || "pi pi-cog";
            const Icon = ICON_MAP[iconKey] || Settings;
            // Use the nav menu name as the section name for color mapping
            const sectionName = navItem.pageMenu;
            const color = SECTION_COLORS[sectionName] || DEFAULT_COLOR;

            quickActions.push({
                id: navItem.pageUrl,
                title: navItem.pageMenu,
                subtitle: navItem.pageMenuLabel || `Go to ${navItem.pageMenu}`,
                icon: Icon,
                path: navItem.pageUrl,
                color: color,
                sectionName: sectionName,
                order: navItem.pageMenuOrder + 100, // Add offset to sort after sections
                source: "NAV",
            });
            addedPaths.add(navItem.pageUrl);
        }
    });

    // Sort: SECTION items first, then NAV items, then by section name, order, and title
    return quickActions.sort((a, b) => {
        // Prioritize SECTION over NAV
        if (a.source !== b.source) {
            return a.source === "SECTION" ? -1 : 1;
        }
        // Then sort by section name
        if (a.sectionName !== b.sectionName) {
            return a.sectionName.localeCompare(b.sectionName);
        }
        // Then by order
        if (a.order !== b.order) {
            return a.order - b.order;
        }
        // Finally by title
        return a.title.localeCompare(b.title);
    });
};

/**
 * Get default 6 quick actions with smart prioritization
 */
const getDefaultActions = (allActions: QuickAction[]): string[] => {
    // Priority sections for default selection
    const prioritySections = [
        "Onboarding",
        "Payments",
        "Inventory",
        "Service Ticketing",
        "Subscriptions",
        "Agent Commission"
    ];
    
    const priorityActions: string[] = [];
    
    // Try to get one action from each priority section
    for (const sectionName of prioritySections) {
        const sectionAction = allActions.find(
            action => action.sectionName === sectionName && !priorityActions.includes(action.id)
        );
        if (sectionAction && priorityActions.length < 6) {
            priorityActions.push(sectionAction.id);
        }
    }
    
    // Fill remaining slots with other actions
    for (const action of allActions) {
        if (!priorityActions.includes(action.id) && priorityActions.length < 6) {
            priorityActions.push(action.id);
        }
        if (priorityActions.length >= 6) break;
    }
    
    return priorityActions;
};

// ============================================================================
// MAIN COMPONENT
// ============================================================================
export default function QuickActions() {
    const [, setLocation] = useLocation();
    const { user } = useAuthContext();
    
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [selectedActionIds, setSelectedActionIds] = useState<string[]>([]);
    const [tempSelectedIds, setTempSelectedIds] = useState<string[]>([]);
    const [isInitialized, setIsInitialized] = useState(false);

    // ========================================================================
    // TRANSFORM MENU ITEMS TO QUICK ACTIONS (SECTION + NAV fallback)
    // ========================================================================
    const allQuickActions: QuickAction[] = useMemo(() => {
        const sections = user?.menuDetails?.menus?.SECTION || [];
        const navItems = user?.menuDetails?.menus?.NAV || [];
        return transformMenuItems(sections, navItems);
    }, [user?.menuDetails?.menus?.SECTION, user?.menuDetails?.menus?.NAV]);

    // ========================================================================
    // LOAD SAVED PREFERENCES OR SET DEFAULTS
    // ========================================================================
    useEffect(() => {
        if (allQuickActions.length > 0 && !isInitialized) {
            const storageKey = `dashboard_quick_actions_${user?.sapBpId || 'default'}`;
            const saved = localStorage.getItem(storageKey);
            
            if (saved) {
                try {
                    const parsed = JSON.parse(saved);
                    // Filter to only include valid action IDs that exist in current menu
                    const validIds = parsed.filter((id: string) => 
                        allQuickActions.some(action => action.id === id)
                    );
                    
                    if (validIds.length > 0) {
                        setSelectedActionIds(validIds.slice(0, 6));
                    } else {
                        setSelectedActionIds(getDefaultActions(allQuickActions));
                    }
                } catch (e) {
                    console.error("Error parsing saved quick actions:", e);
                    setSelectedActionIds(getDefaultActions(allQuickActions));
                }
            } else {
                setSelectedActionIds(getDefaultActions(allQuickActions));
            }
            setIsInitialized(true);
        }
    }, [allQuickActions, isInitialized, user?.sapBpId]);

    // ========================================================================
    // DIALOG HANDLERS
    // ========================================================================
    const handleOpenDialog = () => {
        setTempSelectedIds([...selectedActionIds]);
        setIsDialogOpen(true);
    };

    const handleToggleAction = (id: string, checked: boolean) => {
        if (checked) {
            if (tempSelectedIds.length >= 6) {
                toast({
                    title: "Limit Reached",
                    description: "You can select up to 6 quick actions.",
                    variant: "destructive",
                });
                return;
            }
            setTempSelectedIds([...tempSelectedIds, id]);
        } else {
            if (tempSelectedIds.length <= 1) {
                toast({
                    title: "Minimum Requirement",
                    description: "You must select at least 1 quick action.",
                    variant: "destructive",
                });
                return;
            }
            setTempSelectedIds(tempSelectedIds.filter(actionId => actionId !== id));
        }
    };

    const handleSave = () => {
        setSelectedActionIds(tempSelectedIds);
        const storageKey = `dashboard_quick_actions_${user?.sapBpId || 'default'}`;
        localStorage.setItem(storageKey, JSON.stringify(tempSelectedIds));
        setIsDialogOpen(false);
        toast({
            title: "Quick Actions Updated",
            description: "Your dashboard preferences have been saved.",
        });
    };

    const handleSelectAll = () => {
        const newSelection = allQuickActions.slice(0, 6).map(a => a.id);
        setTempSelectedIds(newSelection);
    };

    const handleClearAll = () => {
        // Keep at least the first one
        setTempSelectedIds([allQuickActions[0]?.id].filter(Boolean));
    };

    const handleResetToDefault = () => {
        const defaults = getDefaultActions(allQuickActions);
        setTempSelectedIds(defaults);
    };

    // ========================================================================
    // COMPUTED VALUES
    // ========================================================================
    const displayedActions = useMemo(() => {
        return allQuickActions.filter(action => selectedActionIds.includes(action.id));
    }, [allQuickActions, selectedActionIds]);

    const groupedActions = useMemo(() => {
        const groups: Record<string, QuickAction[]> = {};
        allQuickActions.forEach(action => {
            if (!groups[action.sectionName]) {
                groups[action.sectionName] = [];
            }
            groups[action.sectionName].push(action);
        });
        // Sort section names alphabetically
        const sortedGroups: Record<string, QuickAction[]> = {};
        Object.keys(groups).sort().forEach(key => {
            sortedGroups[key] = groups[key];
        });
        return sortedGroups;
    }, [allQuickActions]);

    // ========================================================================
    // LOADING STATE
    // ========================================================================
    if (!isInitialized || allQuickActions.length === 0) {
        return (
            <Card className="border-0 shadow-lg h-full flex flex-col">
                <CardHeader>
                    <CardTitle className="text-lg font-semibold text-gray-900">
                        Quick Actions
                    </CardTitle>
                </CardHeader>
                <CardContent className="pt-4 flex-1">
                    <div className="grid grid-cols-2 gap-3 animate-pulse">
                        {[...Array(6)].map((_, i) => (
                            <div key={i} className="h-20 bg-gray-200 rounded-lg"></div>
                        ))}
                    </div>
                </CardContent>
            </Card>
        );
    }

    // ========================================================================
    // RENDER
    // ========================================================================
    return (
        <>
            <Card className="border-0 shadow-lg h-full flex flex-col">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-lg font-semibold text-gray-900">
                        Quick Actions
                    </CardTitle>
                    <Button 
                        variant="ghost" 
                        size="icon" 
                        onClick={handleOpenDialog} 
                        className="h-8 w-8 hover:bg-gray-100 rounded-full" 
                        title="Customize Quick Actions"
                    >
                        <Edit className="h-4 w-4 text-gray-500" />
                    </Button>
                </CardHeader>
                <CardContent className="pt-4 flex-1">
                    <div className="grid grid-cols-2 gap-3 h-full content-start">
                        {displayedActions.map((action) => {
                            const Icon = action.icon;
                            return (
                                <Button
                                    key={action.id}
                                    variant="outline"
                                    className="h-auto p-3 flex flex-col items-center space-y-2 hover:shadow-md transition-all duration-200 hover:border-blue-500/50 group bg-white"
                                    onClick={() => setLocation(action.path)}
                                >
                                    <div className={`${action.color} p-2 rounded-lg group-hover:scale-110 transition-transform shadow-sm`}>
                                        <Icon className="w-5 h-5 text-white" />
                                    </div>
                                    <div className="text-center w-full">
                                        <p className="text-xs font-semibold text-gray-900 truncate w-full">
                                            {action.title}
                                        </p>
                                        <p className="text-[10px] text-gray-500 truncate w-full">
                                            {action.subtitle}
                                        </p>
                                    </div>
                                </Button>
                            );
                        })}
                    </div>
                </CardContent>
            </Card>

            {/* CUSTOMIZATION DIALOG */}
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogContent className="sm:max-w-lg">
                    <DialogHeader>
                        <DialogTitle>Customize Quick Actions</DialogTitle>
                        <DialogDescription>
                            Select up to 6 actions to display on your dashboard. Actions are grouped by section.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="flex justify-end gap-2 pb-2 border-b">
                        <Button variant="outline" size="sm" onClick={handleResetToDefault}>
                            <RefreshCw className="w-3 h-3 mr-1" />
                            Reset Default
                        </Button>
                        <Button variant="outline" size="sm" onClick={handleSelectAll}>
                            <CheckCircle className="w-3 h-3 mr-1" />
                            Select First 6
                        </Button>
                        <Button variant="outline" size="sm" onClick={handleClearAll}>
                            Clear All
                        </Button>
                    </div>

                    <ScrollArea className="h-[400px] pr-4">
                        <div className="space-y-6 py-2">
                            {Object.entries(groupedActions).map(([sectionName, actions]) => (
                                <div key={sectionName} className="space-y-2">
                                    <h4 className="font-semibold text-sm text-gray-700 border-b pb-1 flex items-center gap-2 sticky top-0 bg-white z-10">
                                        <span 
                                            className={`w-3 h-3 rounded-full ${SECTION_COLORS[sectionName] || DEFAULT_COLOR}`}
                                        />
                                        {sectionName}
                                        <span className="ml-auto text-xs text-gray-400 font-normal">
                                            {actions.length} {actions.length === 1 ? 'action' : 'actions'}
                                        </span>
                                    </h4>
                                    <div className="space-y-2 pl-2">
                                        {actions.map((action) => {
                                            const isSelected = tempSelectedIds.includes(action.id);
                                            const Icon = action.icon;

                                            return (
                                                <div 
                                                    key={action.id} 
                                                    className={`flex items-center space-x-3 p-2 rounded border transition-colors ${
                                                        isSelected 
                                                            ? 'bg-blue-50 border-blue-200' 
                                                            : 'hover:bg-gray-50 border-transparent hover:border-gray-100'
                                                    }`}
                                                >
                                                    <Checkbox
                                                        id={`action-${action.id}`}
                                                        checked={isSelected}
                                                        onCheckedChange={(checked) => 
                                                            handleToggleAction(action.id, checked === true)
                                                        }
                                                    />
                                                    <div className={`p-1.5 rounded-md ${action.color}`}>
                                                        <Icon className="w-4 h-4 text-white" />
                                                    </div>
                                                    <Label
                                                        htmlFor={`action-${action.id}`}
                                                        className="flex-1 cursor-pointer font-medium text-sm grid gap-0.5"
                                                    >
                                                        <span className="flex items-center gap-2">
                                                            {action.title}
                                                            {action.source === "NAV" && (
                                                                <span className="text-[10px] px-1.5 py-0.5 bg-gray-100 text-gray-500 rounded">
                                                                    Page
                                                                </span>
                                                            )}
                                                        </span>
                                                        <span className="text-xs text-gray-500 font-normal">
                                                            {action.subtitle}
                                                        </span>
                                                    </Label>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </ScrollArea>

                    <DialogFooter className="flex sm:justify-between items-center sm:space-x-2 border-t pt-4">
                        <div className="text-sm text-gray-500 flex items-center gap-2">
                            <span className={`font-medium ${
                                tempSelectedIds.length > 6 ? 'text-red-500' : 
                                tempSelectedIds.length === 0 ? 'text-orange-500' : 
                                'text-green-600'
                            }`}>
                                {tempSelectedIds.length}
                            </span>
                            / 6 selected
                        </div>
                        <div className="flex space-x-2">
                            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                                Cancel
                            </Button>
                            <Button 
                                onClick={handleSave} 
                                disabled={tempSelectedIds.length === 0 || tempSelectedIds.length > 6}
                            >
                                <Save className="w-4 h-4 mr-2" />
                                Save Changes
                            </Button>
                        </div>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    );
}