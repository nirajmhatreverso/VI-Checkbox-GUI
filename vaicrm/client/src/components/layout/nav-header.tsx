import { useState, useEffect, useMemo } from "react";
import { useLocation } from "wouter";
import { useAuthContext } from "@/context/AuthProvider";

import {
  Users, UserPlus, Package, CreditCard, Receipt, BarChart3, Monitor,
  Settings, MessageCircle, Layers, DollarSign, Cog, MoreHorizontal, ChevronDown, Menu, Plus, Search,
  CheckCircle, ArrowLeftRight, Truck, IdCard, Link2 as Link, Shield, ShoppingCart, FileText, ClipboardCheck, Building,
  UserCheck, Store, RotateCcw, TrendingUp, ArrowRight as UserArrowRight, UserCog, Wrench, AlertTriangle, Settings as Tool, RefreshCw,
  Activity, Clock, Target, Box
} from "lucide-react";
import { resolveIconComponent } from "@/lib/icon-registry";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";


interface NavigationItem {
  name: string;
  path: string;
  icon: React.ComponentType<{ className?: string }>;
  subModules?: ModuleItem[];
}

interface ModuleItem {
  title: string;
  subtitle: string;
  icon: React.ComponentType<{ className?: string }>;
  path: string;
  subPages?: ModuleItem[];
  isCategory?: boolean;
  badge?: string;
  subItems?: { title: string; path: string }[];
}

export default function NavHeader() {
  const [location, setLocation] = useLocation();
  const { user } = useAuthContext();


  const [windowWidth, setWindowWidth] = useState(typeof window !== 'undefined' ? window.innerWidth : 1024);
  const [hoveredItem, setHoveredItem] = useState<string | null>(null);
  const [isHamburgerOpen, setIsHamburgerOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set());

  // Pull NAV + SECTION directly from login response
  const navItemsFromApi = (user?.menuDetails?.menus?.NAV || []) as any[];
  const sections = (user?.menuDetails?.menus?.SECTION || []) as any[];



  // Transform SECTION to ModuleItem[] (kept styling-driven usage intact)
  const transformSectionItems = (apiSections: any[]): ModuleItem[] => {
    return apiSections
      .slice()
      .sort((a, b) => (a.pageMenuOrder ?? 0) - (b.pageMenuOrder ?? 0))
      .map(item => ({
        title: item.pageMenu,
        subtitle: item.pageMenuLabel || "",
        icon: resolveIconComponent(item.pageMenuIcon),
        path: item.pageUrl,
        subPages: item.subMenus ? transformSectionItems(item.subMenus) : undefined,
      }));
  };

  // Transform NAV and attach matching SECTION as subModules
  const transformNavItems = (apiNav: any[], sectionsAll: any[]): any[] => {
    return apiNav
      .slice()
      .sort((a, b) => (a.pageMenuOrder ?? 0) - (b.pageMenuOrder ?? 0))
      .map(item => {
        const matchingSections = sectionsAll.filter(
          (section: any) => (section.pageSectionName || "").trim() === (item.pageMenu || "").trim()
        );

        return {
          name: item.pageMenu,
          path: item.pageUrl,
          icon: resolveIconComponent(item.pageMenuIcon),
          subModules:
            item.subMenus && item.subMenus.length > 0
              ? transformNavItems(item.subMenus, sectionsAll).map((sm: any) => ({
                title: sm.name,
                subtitle: "",
                icon: sm.icon,
                path: sm.path,
                subPages: sm.subModules,
              }))
              : matchingSections.length > 0
                ? transformSectionItems(matchingSections)
                : undefined,
        };
      });
  };

  // Build ALL navigation items dynamically from API
  const allNavigationItems: NavigationItem[] = useMemo(
    () => transformNavItems(navItemsFromApi, sections),
    [navItemsFromApi, sections]
  );

  const toggleSection = (sectionName: string) => {
    const newExpanded = new Set(expandedSections);
    if (newExpanded.has(sectionName)) {
      newExpanded.delete(sectionName);
    } else {
      newExpanded.add(sectionName);
    }
    setExpandedSections(newExpanded);
  };

  // Active checks remain same
  const isNavigationItemActive = (item: NavigationItem) => {
    if (location === item.path) return true;
    if (item.subModules) {
      return item.subModules.some(subModule => {
        if (location === subModule.path) return true;
        if (subModule.subPages) {
          return subModule.subPages.some(subPage => location === subPage.path);
        }
        return false;
      });
    }
    const itemName = item.name.toLowerCase();
    if (itemName.includes('onboarding') && (location.startsWith('/onboarding') || location.startsWith('/agent-onboarding') || location.startsWith('/customer-registration'))) {
      return true;
    }
    if (itemName.includes('approval') && location.startsWith('/kyc-approval')) {
      return true;
    }
    if (itemName.includes('inventory') && (location.startsWith('/inventory') || location.startsWith('/stock') || location.startsWith('/cas-id') || location.startsWith('/stb-sc') || location.startsWith('/track-serial') || location.startsWith('/warehouse') || location.startsWith('/block-unblock') || location.startsWith('/agent-replacement') || location.startsWith('/po-') || location.startsWith('/customer-hardware') || location.startsWith('/agent-hardware') || location.startsWith('/agent-faulty') || location.startsWith('/agent-subagent') || location.startsWith('/sub-agent-stock-overview') || location.startsWith('/subagent-agent'))) {
      return true;
    }
    if (itemName.includes('payment') && (location.startsWith('/payment') || location.startsWith('/receipt') || location.startsWith('/customer-transfer'))) {
      return true;
    }
    if (itemName.includes('subscriber') && location.startsWith('/search-subscriber')) {
      return true;
    }
    if (itemName.includes('adjustment') && location.startsWith('/adjustment')) {
      return true;
    }
    if (itemName.includes('service') && (location.startsWith('/service-ticketing') || location.startsWith('/new-incident') || location.startsWith('/new-service') || location === '/service-ticketing' || location === '/new-incident-management')) {
      return true;
    }
    if (itemName.includes('bulk') && (location.startsWith('/bulk') || location === '/bulk-provision')) {
      return true;
    }
    if (itemName.includes('commission') && (location.startsWith('/agent-commission') || location === '/agent-commission')) {
      return true;
    }
    if (itemName.includes('provisioning') && (location.startsWith('/provisioning') || location === '/provisioning')) {
      return true;
    }
    if (itemName.includes('reports') && (location.startsWith('/reports') || location === '/reports' || location.includes('reports'))) {
      return true;
    }
    if ((itemName.includes('admin') || itemName.includes('menu') || itemName.includes('role')) && (location.startsWith('/admin'))) {
      return true;
    }
    return false;
  };

  useEffect(() => {
    const handleResize = () => {
      const width = window.innerWidth;
      setWindowWidth(width);
      setIsMobile(width < 768);
    };
    handleResize();
    window.addEventListener('resize', handleResize, { passive: true });
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Layout calculation for primary/secondary items (kept styling intact)
  const getNavigationLayout = () => {
    const getItemWidth = (item: NavigationItem) => {
      if (windowWidth < 640) return 44;
      const baseWidth = 28, iconWidth = 16, textWidth = item.name.length * 8;
      return baseWidth + iconWidth + textWidth + 4;
    };

    const allItems = allNavigationItems;
    const moreButtonWidth = windowWidth >= 640 ? 80 : 65;
    const containerPadding = windowWidth >= 640 ? 48 : 32;
    const itemSpacing = 4;
    const safetyBuffer = Math.max(20, windowWidth * 0.02);
    const availableWidth = windowWidth - containerPadding - safetyBuffer;

    let totalWidth = 0, fittingItemsCount = 0;
    for (let i = 0; i < allItems.length; i++) {
      const width = getItemWidth(allItems[i]) + (i > 0 ? itemSpacing : 0);
      if ((totalWidth + width) <= availableWidth) {
        totalWidth += width;
        fittingItemsCount++;
      } else break;
    }

    const finalItemCount = Math.max(fittingItemsCount, 2);
    return {
      primaryItems: allItems.slice(0, finalItemCount),
      secondaryItems: allItems.slice(finalItemCount),
      shouldShowMoreButton: allItems.length > finalItemCount
    };
  };

  const { primaryItems, secondaryItems, shouldShowMoreButton } = getNavigationLayout();
  const shouldShowMoreOnMobile = isMobile && (allNavigationItems.length > 2);

  // These three helpers keep your exact color/design logic
  const getIconColor = (title: string) => {
    const lowerTitle = title.toLowerCase();
    if (lowerTitle.includes('agent') || lowerTitle.includes('customer')) return 'text-blue-600';
    if (lowerTitle.includes('inventory') || lowerTitle.includes('stock') || lowerTitle.includes('hardware')) return 'text-green-600';
    if (lowerTitle.includes('payment') || lowerTitle.includes('billing')) return 'text-purple-600';
    if (lowerTitle.includes('subscription') || lowerTitle.includes('plan') || lowerTitle.includes('renewal')) return 'text-orange-600';
    if (lowerTitle.includes('report') || lowerTitle.includes('analytics')) return 'text-teal-600';
    if (lowerTitle.includes('operation') || lowerTitle.includes('service') || lowerTitle.includes('ticket')) return 'text-red-600';
    if (lowerTitle.includes('admin')) return 'text-slate-600';
    return 'text-azam-blue';
  };

  const getSectionHeaderColors = (title: string) => {
    const lowerTitle = title.toLowerCase();
    if (lowerTitle.includes('stock') || lowerTitle.includes('inventory')) {
      return { bg: 'bg-gradient-to-r from-green-50 to-emerald-50', border: 'border-l-4 border-green-500 border-green-200', icon: 'text-green-600', title: 'text-green-800', subtitle: 'text-green-600' };
    }
    if (lowerTitle.includes('device') || lowerTitle.includes('cas') || lowerTitle.includes('stb')) {
      return { bg: 'bg-gradient-to-r from-blue-50 to-cyan-50', border: 'border-l-4 border-blue-500 border-blue-200', icon: 'text-blue-600', title: 'text-blue-800', subtitle: 'text-blue-600' };
    }
    if (lowerTitle.includes('tracking') || lowerTitle.includes('monitoring')) {
      return { bg: 'bg-gradient-to-r from-purple-50 to-violet-50', border: 'border-l-4 border-purple-500 border-purple-200', icon: 'text-purple-600', title: 'text-purple-800', subtitle: 'text-purple-600' };
    }
    if (lowerTitle.includes('warehouse') || lowerTitle.includes('operations')) {
      return { bg: 'bg-gradient-to-r from-orange-50 to-amber-50', border: 'border-l-4 border-orange-500 border-orange-200', icon: 'text-orange-600', title: 'text-orange-800', subtitle: 'text-orange-600' };
    }
    if (lowerTitle.includes('access') || lowerTitle.includes('control')) {
      return { bg: 'bg-gradient-to-r from-red-50 to-rose-50', border: 'border-l-4 border-red-500 border-red-200', icon: 'text-red-600', title: 'text-red-800', subtitle: 'text-red-600' };
    }
    if (lowerTitle.includes('agent') || lowerTitle.includes('replacement')) {
      return { bg: 'bg-gradient-to-r from-indigo-50 to-blue-50', border: 'border-l-4 border-indigo-500 border-indigo-200', icon: 'text-indigo-600', title: 'text-indigo-800', subtitle: 'text-indigo-600' };
    }
    if (lowerTitle.includes('purchase') || lowerTitle.includes('po')) {
      return { bg: 'bg-gradient-to-r from-teal-50 to-emerald-50', border: 'border-l-4 border-teal-500 border-teal-200', icon: 'text-teal-600', title: 'text-teal-800', subtitle: 'text-teal-600' };
    }
    if (lowerTitle.includes('returns') || lowerTitle.includes('sales')) {
      return { bg: 'bg-gradient-to-r from-pink-50 to-rose-50', border: 'border-l-4 border-pink-500 border-pink-200', icon: 'text-pink-600', title: 'text-pink-800', subtitle: 'text-pink-600' };
    }
    return { bg: 'bg-gradient-to-r from-gray-50 to-slate-50', border: 'border-l-4 border-gray-500 border-gray-200', icon: 'text-gray-600', title: 'text-gray-800', subtitle: 'text-gray-600' };
  };

  const getHoverBg = (title: string) => {
    const lowerTitle = title.toLowerCase();
    if (lowerTitle.includes('agent') || lowerTitle.includes('customer')) return "hover:bg-blue-100/50";
    if (lowerTitle.includes('inventory') || lowerTitle.includes('stock') || lowerTitle.includes('hardware')) return "hover:bg-green-100/50";
    if (lowerTitle.includes('payment') || lowerTitle.includes('billing')) return "hover:bg-purple-100/50";
    if (lowerTitle.includes('subscription') || lowerTitle.includes('plan') || lowerTitle.includes('renewal')) return "hover:bg-orange-100/50";
    if (lowerTitle.includes('report') || lowerTitle.includes('analytics')) return "hover:bg-teal-100/50";
    if (lowerTitle.includes('operation') || lowerTitle.includes('service') || lowerTitle.includes('ticket')) return "hover:bg-red-100/50";
    return "hover:bg-gray-100/50";
  };

  // Render dropdown content (kept your look)
  const renderDropdownContent = (modules: ModuleItem[]) => {
    if (!modules || modules.length === 0) return null;

    const getCategoryGradient = (modules: ModuleItem[]) => {
      if (!modules.length) return "from-gray-50 to-white";
      const firstModule = modules[0].title.toLowerCase();
      if (firstModule.includes('agent') || firstModule.includes('customer')) return "from-blue-50 to-white";
      if (firstModule.includes('inventory') || firstModule.includes('stock')) return "from-green-50 to-white";
      if (firstModule.includes('payment')) return "from-purple-50 to-white";
      if (firstModule.includes('report') || firstModule.includes('analytics')) return "from-teal-50 to-white";
      if (firstModule.includes('operation') || firstModule.includes('service')) return "from-red-50 to-white";
      return "from-orange-50 to-white";
    };

    const getBorderColor = (modules: ModuleItem[]) => {
      if (!modules.length) return "border-gray-200";
      const firstModule = modules[0].title.toLowerCase();
      if (firstModule.includes('agent') || firstModule.includes('customer')) return "border-blue-200";
      if (firstModule.includes('inventory') || firstModule.includes('stock')) return "border-green-200";
      if (firstModule.includes('payment')) return "border-purple-200";
      if (firstModule.includes('report') || firstModule.includes('analytics')) return "border-teal-200";
      if (firstModule.includes('operation') || firstModule.includes('service')) return "border-red-200";
      return "border-orange-200";
    };

    return (
      <div className={`absolute top-full left-0 w-full bg-gradient-to-b ${getCategoryGradient(modules)} border ${getBorderColor(modules)} shadow-lg z-50 rounded-b-lg`}>
        <div className="p-3">
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
            {modules.map((module, index) => {
              const Icon = module.icon;
              const iconColorClass = getIconColor(module.title);
              const hoverBgClass = getHoverBg(module.title);

              if (module.subPages && module.subPages.length > 0) {
                return (
                  <div key={index} className="space-y-1">
                    <div className={`p-2 ${getSectionHeaderColors(module.title).bg} ${getSectionHeaderColors(module.title).border} border rounded-lg shadow-sm ${hoverBgClass}`}>
                      <div className="flex items-center space-x-2 mb-1">
                        <Icon className={`h-4 w-4 ${getSectionHeaderColors(module.title).icon}`} />
                        <div>
                          <p className={`font-bold text-xs ${getSectionHeaderColors(module.title).title} uppercase tracking-wide`}>{module.title}</p>
                          <p className={`text-[10px] ${getSectionHeaderColors(module.title).subtitle} font-medium`}>{module.subtitle}</p>
                        </div>
                      </div>
                      <div className="space-y-0.5">
                        {module.subPages.map((subPage, subPageIndex) => {
                          const SubPageIcon = subPage.icon;
                          const subPageIconColorClass = getIconColor(subPage.title);
                          const subPageHoverBgClass = getHoverBg(subPage.title);
                          const isSubPageActive = location === subPage.path;

                          return (
                            <div
                              key={subPageIndex}
                              onClick={() => setLocation(subPage.path)}
                              className={`cursor-pointer p-1 flex items-center space-x-1.5 rounded-md transition-all duration-200 ${isSubPageActive
                                ? 'bg-gradient-to-r from-green-100 to-green-50 border-l-3 border-green-500 text-green-800 shadow-md'
                                : `${subPageHoverBgClass} hover:shadow-sm hover:border-l-2 hover:border-green-300`
                                }`}
                            >
                              <SubPageIcon className={`h-2.5 w-2.5 flex-shrink-0 ${isSubPageActive ? 'text-green-600' : subPageIconColorClass}`} />
                              <div className="flex-1 min-w-0">
                                <p className={`font-medium text-[10px] truncate ${isSubPageActive ? 'text-green-900' : 'text-gray-900'}`}>{subPage.title}</p>
                                <p className={`text-[9px] truncate ${isSubPageActive ? 'text-green-700' : 'text-gray-500'}`}>{subPage.subtitle}</p>
                              </div>
                              {isSubPageActive && <div className="w-1.5 h-1.5 bg-green-500 rounded-full flex-shrink-0"></div>}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                );
              }

              return (
                <div
                  key={index}
                  onClick={() => setLocation(module.path)}
                  className={`flex items-center space-x-2 p-2 rounded-lg ${hoverBgClass} transition-all duration-200 cursor-pointer group border border-transparent hover:border-white hover:shadow-sm`}
                >
                  <div className="flex-shrink-0">
                    <Icon className={`h-4 w-4 ${iconColorClass} group-hover:scale-110 transition-transform duration-200`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-gray-900 group-hover:text-azam-blue transition-colors duration-200 truncate">
                      {module.title}
                    </p>
                    <p className="text-[10px] text-gray-500 truncate">{module.subtitle}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  };



  return (
    <>
      {isHamburgerOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-40 transition-opacity duration-300"
          onClick={() => setIsHamburgerOpen(false)}
        />
      )}

      {/* Sidebar (hamburger) */}
      <div className={`fixed top-0 left-0 h-full bg-gradient-to-br from-white via-slate-50 to-gray-100 backdrop-blur-lg shadow-2xl border-r border-gray-200 z-50 transition-all duration-500 ease-out overflow-y-auto ${isHamburgerOpen ? 'translate-x-0' : '-translate-x-full'
        } ${isMobile ? 'w-80' : 'w-96'}`}>
        <div className="relative bg-gradient-to-r from-azam-blue via-blue-600 to-azam-blue text-white shadow-lg">
          <div className="absolute inset-0 bg-gradient-to-r from-blue-600/20 via-transparent to-blue-600/20"></div>
          <div className="relative flex items-center justify-between p-6">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-white/20 rounded-lg backdrop-blur-sm">
                <Menu className="h-6 w-6 text-white" />
              </div>
              <div>
                <h2 className="text-xl font-bold tracking-wide">AZAM TV</h2>
                <p className="text-sm text-blue-100 font-medium">AZAM TV Portal</p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsHamburgerOpen(false)}
              className="text-white hover:bg-white/20 p-2 rounded-full transition-all duration-200 hover:scale-110"
            >
              <div className="relative">
                <div className="w-5 h-5 flex items-center justify-center">
                  <span className="text-lg font-light">×</span>
                </div>
              </div>
            </Button>
          </div>
        </div>

        <div className="p-6">
          {/* User Info */}
          <div className="mb-6 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl border border-blue-100 shadow-sm">
            <div className="flex items-center space-x-3">
              <div className="w-12 h-12 bg-gradient-to-br from-azam-blue to-blue-600 rounded-full flex items-center justify-center text-white font-bold text-lg shadow-md">
                {user?.name?.charAt(0) || 'U'}
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-gray-900 text-base">{user?.name} {user?.name}</h3>
                <p className="text-sm text-gray-600 font-medium">{user?.allAccess === 'Y' || 'Administrator'}</p>
              </div>
            </div>
          </div>

          {/* Core Navigation Items (dynamic) */}
          <div className="space-y-2">
            {allNavigationItems.map((item) => {
              const Icon = item.icon;
              const isActive = isNavigationItemActive(item);

              const getItemColors = (name: string) => {
                const lowerName = name.toLowerCase();
                if (lowerName.includes('dashboard')) {
                  return { icon: isActive ? "text-blue-600" : "text-blue-500", hover: "hover:bg-blue-50 hover:text-blue-700", active: "bg-blue-50/80 text-blue-700 border-l-2 border-blue-500" };
                }
                if (lowerName.includes('onboarding')) {
                  return { icon: isActive ? "text-orange-600" : "text-orange-500", hover: "hover:bg-orange-50 hover:text-orange-700", active: "bg-orange-50/80 text-orange-700 border-l-2 border-orange-500" };
                }
                if (lowerName.includes('inventory')) {
                  return { icon: isActive ? "text-green-600" : "text-green-500", hover: "hover:bg-green-50 hover:text-green-700", active: "bg-green-50/80 text-green-700 border-l-2 border-green-500" };
                }
                if (lowerName.includes('payment')) {
                  return { icon: isActive ? "text-purple-600" : "text-purple-500", hover: "hover:bg-purple-50 hover:text-purple-700", active: "bg-purple-50/80 text-purple-700 border-l-2 border-purple-500" };
                }
                if (lowerName.includes('subscriber')) {
                  return { icon: isActive ? "text-orange-600" : "text-orange-500", hover: "hover:bg-orange-50 hover:text-orange-700", active: "bg-orange-50/80 text-orange-700 border-l-2 border-orange-500" };
                }
                if (lowerName.includes('adjustment')) {
                  return { icon: isActive ? "text-gray-600" : "text-gray-500", hover: "hover:bg-gray-50 hover:text-gray-700", active: "bg-gray-50/80 text-gray-700 border-l-2 border-gray-500" };
                }
                return { icon: isActive ? "text-azam-blue" : "text-gray-500", hover: "hover:bg-azam-blue/5 hover:text-azam-blue", active: "bg-azam-blue/5 text-azam-blue border-l-2 border-azam-blue" };
              };

              const colors = getItemColors(item.name);

              if (item.subModules && item.subModules.length > 0) {
                const isExpanded = expandedSections.has(item.name);

                return (
                  <div key={item.path} className="space-y-1">
                    <div
                      onClick={() => toggleSection(item.name)}
                      className={`cursor-pointer p-4 flex items-center justify-between rounded-xl transition-all duration-300 group shadow-sm border ${isActive ? colors.active + ' shadow-md' : colors.hover + ' bg-white/80 border-gray-100 hover:shadow-lg hover:border-gray-200'}`}
                    >
                      <div className="flex items-center space-x-4">
                        <div className="p-2 rounded-lg bg-gradient-to-br from-gray-50 to-gray-100 group-hover:from-white group-hover:to-gray-50 transition-all duration-200">
                          <Icon className="h-5 w-5 flex-shrink-0 text-current" />
                        </div>
                        <span className="font-semibold text-base tracking-wide">{item.name}</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <div className={`w-2 h-2 rounded-full transition-all duration-200 ${isExpanded ? 'bg-azam-blue' : 'bg-gray-300'}`}></div>
                        <ChevronDown className={`h-5 w-5 text-gray-400 transition-all duration-300 ${isExpanded ? 'rotate-180 text-azam-blue' : ''}`} />
                      </div>
                    </div>

                    {isExpanded && (
                      <div className="ml-8 mt-3 space-y-2 border-l-4 border-gradient-to-b from-azam-blue/50 to-gray-200 pl-4 bg-gradient-to-r from-blue-50/30 rounded-r-lg">
                        {item.subModules.map((subModule, subIndex) => {
                          const SubIcon = subModule.icon;
                          const subIconColorClass = getIconColor(subModule.title);
                          const subHoverBgClass = getHoverBg(subModule.title);
                          const isSubActive = location === subModule.path;

                          if (subModule.subPages && subModule.subPages.length > 0) {
                            return (
                              <div key={subIndex} className="border-b border-gray-100 last:border-b-0 py-2">
                                <div className={`px-3 py-2 ${getSectionHeaderColors(subModule.title).bg} ${getSectionHeaderColors(subModule.title).border} border rounded-lg shadow-sm mb-1`}>
                                  <div className="flex items-center space-x-2">
                                    <SubIcon className={`h-4 w-4 ${getSectionHeaderColors(subModule.title).icon}`} />
                                    <div>
                                      <p className={`font-bold text-sm ${getSectionHeaderColors(subModule.title).title} uppercase tracking-wide`}>{subModule.title}</p>
                                      <p className={`text-xs ${getSectionHeaderColors(subModule.title).subtitle} font-medium`}>{subModule.subtitle}</p>
                                    </div>
                                  </div>
                                </div>
                                <div className="pl-4 space-y-1 mt-1">
                                  {subModule.subPages.map((subPage, subPageIndex) => {
                                    const SubPageIcon = subPage.icon;
                                    const subPageIconColorClass = getIconColor(subPage.title);
                                    const subPageHoverBgClass = getHoverBg(subPage.title);
                                    const isSubPageActive = location === subPage.path;

                                    return (
                                      <div
                                        key={subPageIndex}
                                        onClick={() => {
                                          setLocation(subPage.path);
                                          setIsHamburgerOpen(false);
                                        }}
                                        className={`cursor-pointer p-2 flex items-start space-x-2 rounded-md transition-all duration-200 ${isSubPageActive
                                          ? 'bg-gradient-to-r from-green-100 to-green-50 border-l-3 border-green-500 text-green-800 shadow-lg'
                                          : `${subPageHoverBgClass} hover:border-l-2 hover:border-green-300 hover:shadow-sm`
                                          }`}
                                      >
                                        <SubPageIcon className={`h-4 w-4 mt-0.5 flex-shrink-0 ${isSubPageActive ? 'text-green-600' : subPageIconColorClass}`} />
                                        <div className="flex-1 min-w-0">
                                          <p className={`font-medium text-sm leading-tight ${isSubPageActive ? 'text-green-900' : 'text-gray-900'}`}>{subPage.title}</p>
                                          <p className={`text-xs text-gray-500 leading-tight mt-0.5 whitespace-normal ${isSubPageActive ? 'text-green-700' : 'text-gray-500'}`}>{subModule.subtitle}</p>
                                        </div>
                                        {isSubPageActive && <div className="w-2 h-2 bg-green-500 rounded-full flex-shrink-0 mt-1"></div>}
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>
                            );
                          }

                          return (
                            <div
                              key={subIndex}
                              onClick={() => {
                                setLocation(subModule.path);
                                setIsHamburgerOpen(false);
                              }}
                              className={`cursor-pointer p-4 flex items-start space-x-3 rounded-xl transition-all duration-300 group ${isSubActive ? 'bg-gradient-to-r from-azam-blue/10 to-blue-50 text-azam-blue border border-azam-blue/20 shadow-md' : 'bg-white/60 hover:bg-white hover:shadow-lg border border-transparent hover:border-gray-200'}`}
                            >
                              <div className="p-1.5 rounded-lg bg-gradient-to-br from-gray-100 to-gray-200 group-hover:from-white group-hover:to-gray-100 transition-all duration-200">
                                <SubIcon className="h-4 w-4 flex-shrink-0 text-current" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="font-semibold text-sm text-gray-900 leading-tight tracking-wide">{subModule.title}</p>
                                <p className="text-xs text-gray-600 leading-tight mt-1 whitespace-normal">{subModule.subtitle}</p>
                              </div>
                              {isSubActive && <div className="flex-shrink-0"><div className="w-2 h-2 bg-azam-blue rounded-full"></div></div>}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              } else {
                return (
                  <div
                    key={item.path}
                    onClick={() => {
                      setLocation(item.path);
                      setIsHamburgerOpen(false);
                    }}
                    className={`cursor-pointer p-4 flex items-center space-x-4 rounded-xl transition-all duration-300 group shadow-sm border ${isActive ? colors.active + ' shadow-md' : colors.hover + ' bg-white/80 border-gray-100 hover:shadow-lg hover:border-gray-200'}`}
                  >
                    <div className="p-2 rounded-lg bg-gradient-to-br from-gray-50 to-gray-100 group-hover:from-white group-hover:to-gray-50 transition-all duration-200">
                      <Icon className="h-5 w-5 flex-shrink-0 text-current" />
                    </div>
                    <span className="font-semibold text-base tracking-wide flex-1">{item.name}</span>
                    {isActive && <div className="w-2 h-2 bg-azam-blue rounded-full"></div>}
                  </div>
                );
              }
            })}
          </div>



          {/* Footer */}
          <div className="mt-8 pt-6 border-t border-gray-200">
            <div className="p-4 bg-gradient-to-r from-gray-50 to-slate-50 rounded-xl border border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold text-gray-700 uppercase tracking-wide">AZAM TV Portal</p>
                  <p className="text-xs text-gray-500 mt-0.5">Welcome to AZAM TV Agent Management System</p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-gray-500">Version 2.1.0</p>
                  <p className="text-xs text-gray-400">© 2025 AZAM</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Top Navbar (kept design) */}
      <div className="relative bg-azam-blue px-2 sm:px-3 md:px-4 py-0">
        <div className={`flex items-center justify-between w-full ${isMobile ? 'h-12' : 'h-10'}`}>
          {/* Hamburger */}
          <div className={`flex-shrink-0 ${isMobile ? 'mr-2' : 'mr-3'}`}>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsHamburgerOpen(!isHamburgerOpen)}
              className={`flex items-center justify-center p-0 text-white hover:bg-white/10 rounded-lg transition-all duration-300 hover:scale-105 ${isMobile ? 'w-10 h-10' : 'w-9 h-9'
                }`}
            >
              <Menu className={`${isMobile ? 'h-6 w-6' : 'h-5 w-5'}`} />
            </Button>
          </div>

          {/* Mobile: hide items */}
          {isMobile ? (
            <div className="flex-1"></div>
          ) : (
            <div className="flex items-center space-x-0 flex-1 overflow-hidden">
              {primaryItems.map((item) => {
                const Icon = item.icon;
                const isActive = isNavigationItemActive(item);

                return (
                  <div
                    key={item.path}
                    className="relative"
                    onMouseEnter={() => item.subModules && setHoveredItem(item.name)}
                    onMouseLeave={() => setHoveredItem(null)}
                  >
                    {item.subModules ? (
                      <div
                        className={`flex items-center space-x-1.5 px-4 py-2.5 text-sm font-semibold transition-all duration-300 whitespace-nowrap rounded-lg cursor-default
                          ${isActive
                            ? "bg-white/95 text-azam-orange shadow-lg backdrop-blur-sm"
                            : "text-white hover:bg-white/95 hover:text-azam-orange hover:shadow-lg hover:backdrop-blur-sm hover:scale-105"}
                        `}
                      >
                        <Icon className="h-4 w-4" />
                        <span className="hidden sm:inline">{item.name}</span>
                      </div>
                    ) : (
                      <button
                        onClick={() => setLocation(item.path)}
                        className={`flex items-center space-x-1.5 px-4 py-2.5 text-sm font-semibold whitespace-nowrap rounded-lg transition-all duration-300
                          ${isActive
                            ? "bg-white/95 text-azam-orange shadow-lg backdrop-blur-sm scale-105"
                            : "text-white hover:bg-white/95 hover:text-azam-orange hover:shadow-lg hover:backdrop-blur-sm hover:scale-105"}
                        `}
                      >
                        <Icon className="h-4 w-4" />
                        <span className="hidden sm:inline">{item.name}</span>
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* More menu */}
          {!isMobile && (shouldShowMoreButton || shouldShowMoreOnMobile) && (
            <div className="flex-shrink-0 ml-2">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className={`flex items-center space-x-1 text-sm font-semibold text-white hover:bg-white/95 hover:text-azam-orange rounded-lg hover:shadow-lg hover:backdrop-blur-sm transition-all duration-300 hover:scale-105 ${isMobile ? 'px-2 py-2 h-10' : 'px-3 py-2 h-9'
                      }`}
                  >
                    <MoreHorizontal className="h-3.5 w-3.5" />
                    <span className="hidden sm:inline text-xs">More</span>
                    <ChevronDown className="h-3 w-3" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56 mt-1 bg-gradient-to-b from-slate-50 to-white shadow-lg border border-slate-200 rounded-lg">
                  {(isMobile ? [...allNavigationItems.slice(2), ...allNavigationItems] : secondaryItems).map((item) => {
                    const Icon = item.icon;
                    const isActive = isNavigationItemActive(item);

                    const getItemColors = (name: string) => {
                      const lowerName = name.toLowerCase();
                      if (lowerName.includes('service') || lowerName.includes('ticketing')) {
                        return { icon: isActive ? "text-blue-600" : "text-blue-500", hover: "hover:bg-blue-50 hover:text-blue-700", active: "bg-blue-50/80 text-blue-700 border-l-2 border-blue-500" };
                      }
                      if (lowerName.includes('bulk')) {
                        return { icon: isActive ? "text-indigo-600" : "text-indigo-500", hover: "hover:bg-indigo-50 hover:text-indigo-700", active: "bg-indigo-50/80 text-indigo-700 border-l-2 border-indigo-500" };
                      }
                      if (lowerName.includes('commission')) {
                        return { icon: isActive ? "text-green-600" : "text-green-500", hover: "hover:bg-green-50 hover:text-green-700", active: "bg-green-50/80 text-green-700 border-l-2 border-green-500" };
                      }
                      if (lowerName.includes('provisioning')) {
                        return { icon: isActive ? "text-purple-600" : "text-purple-500", hover: "hover:bg-purple-50 hover:text-purple-700", active: "bg-purple-50/80 text-purple-700 border-l-2 border-purple-500" };
                      }
                      if (lowerName.includes('adjustment')) {
                        return { icon: isActive ? "text-orange-600" : "text-orange-500", hover: "hover:bg-orange-50 hover:text-orange-700", active: "bg-orange-50/80 text-orange-700 border-l-2 border-orange-500" };
                      }
                      if (lowerName.includes('reports')) {
                        return { icon: isActive ? "text-teal-600" : "text-teal-500", hover: "hover:bg-teal-50 hover:text-teal-700", active: "bg-teal-50/80 text-teal-700 border-l-2 border-teal-500" };
                      }
                      return { icon: isActive ? "text-azam-blue" : "text-gray-500", hover: "hover:bg-azam-blue/5 hover:text-azam-blue", active: "bg-azam-blue/10 text-azam-blue border-l-2 border-azam-blue" };
                    };

                    const colors = getItemColors(item.name);

                    if (item.subModules && item.subModules.length > 0) {
                      return (
                        <DropdownMenuSub key={item.path}>
                          <DropdownMenuSubTrigger className={`cursor-pointer p-3 flex items-center justify-between rounded-md transition-all duration-200 mx-1 ${isActive ? colors.active : colors.hover}`}>
                            <div className="flex items-center space-x-3">
                              <Icon className={`h-4 w-4 flex-shrink-0 ${colors.icon}`} />
                              <span className="font-medium text-sm">{item.name}</span>
                            </div>
                          </DropdownMenuSubTrigger>
                          <DropdownMenuSubContent className="w-64 bg-gradient-to-b from-slate-50 to-white shadow-lg border border-slate-200 rounded-lg">
                            {item.subModules.map((subModule, subIndex) => {
                              const SubIcon = subModule.icon;
                              const subIconColorClass = getIconColor(subModule.title);
                              const subHoverBgClass = getHoverBg(subModule.title);
                              const isSubActive = location === subModule.path;

                              return (
                                <DropdownMenuItem
                                  key={subIndex}
                                  onClick={() => setLocation(subModule.path)}
                                  className={`cursor-pointer p-3 flex items-center space-x-3 rounded-md transition-all duration-200 mx-1 ${isSubActive
                                    ? 'bg-gradient-to-r from-blue-100 to-blue-50 border-l-3 border-blue-500 text-blue-800 shadow-md'
                                    : `${subHoverBgClass} hover:border-l-2 hover:border-blue-300 hover:shadow-sm`
                                    }`}
                                >
                                  <SubIcon className={`h-4 w-4 flex-shrink-0 ${isSubActive ? 'text-blue-600' : subIconColorClass}`} />
                                  <div className="flex-1">
                                    <p className={`font-medium text-sm ${isSubActive ? 'text-blue-900' : 'text-gray-900'}`}>{subModule.title}</p>
                                    <p className={`text-xs truncate ${isSubActive ? 'text-blue-700' : 'text-gray-500'}`}>{subModule.subtitle}</p>
                                  </div>
                                  {isSubActive && <div className="w-2 h-2 bg-blue-500 rounded-full flex-shrink-0"></div>}
                                </DropdownMenuItem>
                              );
                            })}
                          </DropdownMenuSubContent>
                        </DropdownMenuSub>
                      );
                    }

                    return (
                      <DropdownMenuItem
                        key={item.path}
                        onClick={() => setLocation(item.path)}
                        className={`cursor-pointer p-3 flex items-center space-x-3 rounded-md transition-all duration-200 mx-1 ${isActive
                          ? colors.active
                          : colors.hover
                          }`}
                      >
                        <Icon className={`h-4 w-4 flex-shrink-0 ${colors.icon}`} />
                        <span className="font-medium text-sm">{item.name}</span>
                      </DropdownMenuItem>
                    );
                  })}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          )}
        </div>

        {hoveredItem && !isMobile && (
          <div
            onMouseEnter={() => setHoveredItem(hoveredItem)}
            onMouseLeave={() => setHoveredItem(null)}
          >
            {(() => {
              const hoveredItemData = [...allNavigationItems, ...allNavigationItems].find(item => item.name === hoveredItem);
              return hoveredItemData?.subModules ? renderDropdownContent(hoveredItemData.subModules) : null;
            })()}
          </div>
        )}
      </div>
    </>
  );
}