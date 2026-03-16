import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/hooks/use-auth";
import { useLocation } from "wouter";
import { Bell, Search, Command, User, Package, CreditCard, BarChart3, Settings, MessageCircle, Layers, DollarSign, Cog } from "lucide-react";
import { useState, useEffect, useRef } from "react";

import { useAuthContext } from "@/context/AuthProvider";

const pageTitles: Record<string, string> = {
  "/": "Dashboard",
  "/dashboard": "Dashboard",
  "/agent-onboarding": "Agent Onboarding",
  "/customer-registration": "Customer Registration",
  "/kyc-verification": "KYC Verification",
  "/kyc-approval": "KYC Approval",
  "/inventory": "Inventory Management",
  "/stock-overview": "Stock Overview",
  "/stock-request": "Stock Request",
  "/stock-approval": "Stock Approval",
  "/payments": "Payment Processing",
  "/agent-payment-hw": "Agent Payment - Hardware",
  "/agent-payment-subscription": "Agent Payment - Subscription",
  "/customer-payment-hw": "Customer Payment - Hardware",
  "/customer-payment-subscription": "Customer Payment - Subscription",
  "/subscriptions": "Subscription Management",
  "/search-subscriber": "Search Subscriber",
  "/adjustment": "Adjustment",
  "/service-ticketing": "Service Ticketing",
  "/new-incident-management": "New Incident Management",
  "/bulk-provision": "Bulk Provisioning",
  "/agent-commission": "Agent Commission",
  "/provisioning": "Provisioning",
  "/reports": "Reports & Analytics",
  "/reports/daily": "Daily Reports",
  "/reports/TRA": "TRA Reports",
  "/reports/TCRA": "TCRA Reports",
};

const searchablePages = [
  { title: "Dashboard", path: "/dashboard", icon: BarChart3, category: "Overview", description: "Main dashboard with analytics" },
  { title: "Agent Onboarding", path: "/agent-onboarding", icon: User, category: "Onboarding", description: "Register new agents" },
  { title: "Customer Registration", path: "/customer-registration", icon: User, category: "Onboarding", description: "Register new customers" },
  { title: "KYC Verification", path: "/kyc-verification", icon: User, category: "Onboarding", description: "Verify customer KYC documents" },
  { title: "KYC Approval", path: "/kyc-approval", icon: User, category: "Onboarding", description: "Approve pending KYC requests" },
  { title: "Stock Overview", path: "/stock-overview", icon: Package, category: "Inventory", description: "View current stock levels" },
  { title: "Stock Request", path: "/stock-request", icon: Package, category: "Inventory", description: "Request new inventory items" },
  { title: "Stock Approval", path: "/stock-approval", icon: Package, category: "Inventory", description: "Approve stock requests" },
  { title: "Agent Payment - Hardware", path: "/agent-payment-hw", icon: CreditCard, category: "Payments", description: "Process agent hardware payments" },
  { title: "Customer Payment - Hardware", path: "/customer-payment-hw", icon: CreditCard, category: "Payments", description: "Process customer hardware payments" },
  { title: "Search Subscriber", path: "/search-subscriber", icon: User, category: "Subscriptions", description: "Find customer subscriptions" },
  { title: "Adjustment", path: "/adjustment", icon: Settings, category: "Operations", description: "Create and manage adjustments" },
  { title: "Service Ticketing", path: "/service-ticketing", icon: MessageCircle, category: "Operations", description: "Handle service tickets" },
  { title: "New Incident Management", path: "/new-incident-management", icon: MessageCircle, category: "Operations", description: "Manage service incidents" },
  { title: "Bulk Provisioning", path: "/bulk-provision", icon: Layers, category: "Operations", description: "Bulk upload and provisioning" },
  { title: "Agent Commission", path: "/agent-commission", icon: DollarSign, category: "Operations", description: "View agent commissions" },
  { title: "Provisioning", path: "/provisioning", icon: Cog, category: "Operations", description: "On-screen display management" },
  { title: "Daily Reports", path: "/reports/daily", icon: BarChart3, category: "Reports", description: "View daily operational reports" },
  { title: "TRA Reports", path: "/reports/TRA", icon: BarChart3, category: "Reports", description: "View TRA compliance reports" },
  { title: "TCRA Reports", path: "/reports/TCRA", icon: BarChart3, category: "Reports", description: "View TCRA compliance reports" },
];

export default function Header() {
  const { user, logout } = useAuthContext();
  const [location, setLocation] = useLocation();

  const [searchQuery, setSearchQuery] = useState("");
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [filteredPages, setFilteredPages] = useState(searchablePages);
  const searchRef = useRef<HTMLDivElement>(null);
  const handleLogout = async () => {
    await logout();
  };

  const pageTitle = pageTitles[location] || "Dashboard";
  const userInitials = user ? `${user.name?.[0] || ''}${user.name?.[0] || ''}` : 'U';

  // Filter pages based on search query
  useEffect(() => {
    if (searchQuery.trim() === "") {
      setFilteredPages(searchablePages);
    } else {
      const filtered = searchablePages.filter(page =>
        page.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        page.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
        page.description.toLowerCase().includes(searchQuery.toLowerCase())
      );
      setFilteredPages(filtered);
    }
  }, [searchQuery]);

  // Close search results when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setIsSearchFocused(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Keyboard shortcuts for search
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Ctrl+K or Cmd+K to focus search
      if ((event.ctrlKey || event.metaKey) && event.key === 'k') {
        event.preventDefault();
        const searchInput = searchRef.current?.querySelector('input');
        if (searchInput) {
          searchInput.focus();
          setIsSearchFocused(true);
        }
      }
      // Escape to close search
      if (event.key === 'Escape' && isSearchFocused) {
        setIsSearchFocused(false);
        setSearchQuery("");
        const searchInput = searchRef.current?.querySelector('input');
        if (searchInput) {
          searchInput.blur();
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isSearchFocused]);

  const handleSearchItemClick = (path: string) => {
    setLocation(path);
    setSearchQuery("");
    setIsSearchFocused(false);
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case "Overview": return "text-blue-600 bg-blue-50";
      case "Onboarding": return "text-orange-600 bg-orange-50";
      case "Inventory": return "text-green-600 bg-green-50";
      case "Payments": return "text-purple-600 bg-purple-50";
      case "Subscriptions": return "text-indigo-600 bg-indigo-50";
      case "Operations": return "text-red-600 bg-red-50";
      case "Reports": return "text-teal-600 bg-teal-50";
      default: return "text-gray-600 bg-gray-50";
    }
  };

  return (
    <header className="bg-white shadow-sm border-b px-6 py-4">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-semibold text-azam-dark">{pageTitle}</h2>

        {/* Enhanced Search Bar */}
        <div className="flex-1 max-w-2xl mx-8 relative" ref={searchRef}>
          <div className="search-bar-container relative rounded-xl overflow-hidden">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none z-10">
              <Search className={`h-5 w-5 transition-colors duration-200 ${isSearchFocused ? 'text-azam-blue' : 'text-gray-400'}`} />
            </div>
            <Input
              type="text"
              placeholder="Search pages, features, or functions... (Ctrl+K)"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onFocus={() => setIsSearchFocused(true)}
              className="w-full pl-12 pr-16 py-3 bg-transparent border-0 rounded-xl focus:bg-transparent focus:border-0 focus:ring-0 transition-all duration-200 text-sm placeholder:text-gray-500 focus:placeholder:text-gray-400"
            />
            <div className="absolute inset-y-0 right-0 pr-4 flex items-center pointer-events-none z-10">
              <div className={`flex items-center space-x-1 px-2 py-1 rounded-md text-xs transition-all duration-200 ${isSearchFocused ? 'bg-azam-blue/10 text-azam-blue border border-azam-blue/20' : 'text-gray-400'
                }`}>
                <Command className="h-3 w-3" />
                <span className="font-medium">K</span>
              </div>
            </div>
          </div>

          {/* Search Results Dropdown */}
          {isSearchFocused && (
            <div className="search-results-dropdown absolute top-full left-0 right-0 mt-3 rounded-xl z-50 max-h-96 overflow-y-auto">
              {filteredPages.length > 0 ? (
                <div className="p-3">
                  {/* Group by category */}
                  {Array.from(new Set(filteredPages.map(page => page.category))).map(category => (
                    <div key={category} className="mb-4 last:mb-0">
                      <div className={`search-category-badge inline-flex items-center px-3 py-1.5 rounded-lg text-xs font-semibold mb-3 ${getCategoryColor(category)}`}>
                        {category}
                      </div>
                      <div className="space-y-2">
                        {filteredPages
                          .filter(page => page.category === category)
                          .map((page, index) => {
                            const Icon = page.icon;
                            const isCurrentPage = location === page.path;
                            return (
                              <div
                                key={index}
                                onClick={() => handleSearchItemClick(page.path)}
                                className={`search-item flex items-center space-x-3 p-3 rounded-xl cursor-pointer group ${isCurrentPage
                                    ? 'bg-azam-blue/10 border border-azam-blue/20'
                                    : 'hover:bg-gray-50'
                                  }`}
                              >
                                <div className={`p-2.5 rounded-xl ${isCurrentPage ? 'bg-azam-blue/20' : 'bg-gray-100 group-hover:bg-white'} transition-all duration-200 group-hover:scale-105`}>
                                  <Icon className={`h-4 w-4 ${isCurrentPage ? 'text-azam-blue' : 'text-gray-600 group-hover:text-azam-blue'}`} />
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className={`font-semibold text-sm ${isCurrentPage ? 'text-azam-blue' : 'text-gray-900'}`}>
                                    {page.title}
                                  </p>
                                  <p className="text-xs text-gray-500 truncate mt-0.5">
                                    {page.description}
                                  </p>
                                </div>
                                {isCurrentPage && (
                                  <div className="flex items-center space-x-2">
                                    <div className="text-xs text-azam-blue font-medium bg-azam-blue/10 px-2 py-1 rounded-md">
                                      Current
                                    </div>
                                    <div className="w-2 h-2 bg-azam-blue rounded-full animate-pulse"></div>
                                  </div>
                                )}
                              </div>
                            );
                          })}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-8 text-center">
                  <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Search className="h-8 w-8 text-gray-300" />
                  </div>
                  <p className="text-sm font-medium text-gray-700 mb-1">No results found</p>
                  <p className="text-xs text-gray-500">Try searching for "{searchQuery}" in different terms</p>
                  <p className="text-xs text-gray-400 mt-2">Search features, pages, or functions</p>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="flex items-center space-x-4">
          <Button variant="ghost" size="icon" className="relative">
            <Bell className="h-5 w-5 text-gray-600" />
            <span className="absolute -top-1 -right-1 w-3 h-3 bg-azam-red rounded-full"></span>
          </Button>

          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-azam-blue rounded-full flex items-center justify-center">
              <span className="text-white text-sm font-medium">
                {userInitials || 'JD'}
              </span>
            </div>
            <div>
              <p className="text-sm font-medium text-azam-dark">
                {user ? `${user.name || ''} ${user.name || ''}`.trim() || user.username : 'John Doe'}
              </p>
              <p className="text-xs text-gray-500">
                {user?.allAccess === 'Y' || 'Admin'}
              </p>
            </div>
            <Button variant="outline" size="sm" onClick={handleLogout}>
              Logout
            </Button>
          </div>
        </div>
      </div>
    </header>
  );
}
