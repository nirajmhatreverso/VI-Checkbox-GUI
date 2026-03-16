import { useState } from "react";
import { ChevronDown, User, Settings, LogOut, Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { useAuthContext } from "@/context/AuthProvider";
import AdvancedSearch from "@/components/ui/advanced-search";
import { NotificationCenter } from "@/components/notifications/notification-center";
import TanzaniaTime from "@/components/ui/tanzania-time";
import logo from "@/assets/logo.png";

export default function TopHeader() {
  const [, setLocation] = useLocation();

  const [isApiConfigOpen, setIsApiConfigOpen] = useState(false);
  const { user, logout } = useAuthContext();


  // Comprehensive page structure with categories and sub-pages
  const allPages = [
    // Core Modules
    { name: "Dashboard", path: "/dashboard", category: "Core" },

    // Onboarding
    { name: "Agent Onboarding", path: "/agent-onboarding", category: "Onboarding" },
    { name: "Customer Registration", path: "/customer-registration", category: "Onboarding" },

    // Inventory Management
    { name: "Stock Overview", path: "/stock-overview", category: "Inventory" },
    { name: "Stock Request", path: "/stock-request", category: "Inventory" },
    { name: "Stock Approval", path: "/stock-approval", category: "Inventory" },
    { name: "Stock Transfer", path: "/stock-transfer", category: "Inventory" },
    { name: "Track Serial", path: "/track-serial", category: "Inventory" },
    { name: "CAS ID Change", path: "/cas-id-change", category: "Inventory" },
    { name: "STB-SC Pairing", path: "/stb-sc-pairing", category: "Inventory" },
    { name: "Warehouse Transfer", path: "/warehouse-transfer", category: "Inventory" },
    { name: "Block/Unblock Agent", path: "/block-unblock-agent", category: "Inventory" },
    { name: "Block/Unblock Center", path: "/block-unblock-center", category: "Inventory" },
    { name: "PO GRN Update", path: "/po-grn-update", category: "Inventory" },
    { name: "PO View", path: "/po-view", category: "Inventory" },
    { name: "Customer Hardware Return", path: "/customer-hardware-return", category: "Inventory" },
    { name: "Agent Faulty Repair", path: "/agent-faulty-repair", category: "Inventory" },

    // Payment Management
    { name: "Agent Payment - HW", path: "/agent-payment-hw", category: "Payments" },
    { name: "Agent Payment - Subscription", path: "/agent-payment-subscription", category: "Payments" },
    { name: "Customer Payment - HW", path: "/customer-payment-hw", category: "Payments" },
    { name: "Customer Payment - Subscription", path: "/customer-payment-subscription", category: "Payments" },
    { name: "Receipt Cancellation", path: "/receipt-cancellation", category: "Payments" },
    { name: "Customer Transfer", path: "/customer-transfer", category: "Payments" },

    // Subscription Management
    { name: "Search Subscriber", path: "/search-subscriber", category: "Subscribers" },

    // Operations
    { name: "Adjustment", path: "/adjustment", category: "Operations" },
    { name: "New Incident Management", path: "/new-incident-management", category: "Service Ticketing" },
    { name: "Customer Specific List", path: "/customer-specific-list", category: "Service Ticketing" },
    { name: "My Work", path: "/my-work", category: "Service Ticketing" },
    { name: "Bulk Provision", path: "/bulk-provision", category: "Operations" },
    { name: "Agent Commission", path: "/agent-commission", category: "Operations" },
    { name: "Provisioning", path: "/provisioning", category: "Operations" },

    // Reports & Analytics
    { name: "Reports", path: "/reports", category: "Reports" },

    // Administration
    //{ name: "User Management", path: "/user-management", category: "Administration" },
    //{ name: "System Settings", path: "/system-settings", category: "Administration" },
    //{ name: "Audit Logs", path: "/audit-logs", category: "Administration" },
  ];

  // Hot keys for popular searches
  const hotKeys = [
    "Dashboard",
    "Inventory Management",
    "Payments",
    "Subscriptions",
    "Agent Management",
    "Customer Management",
    "Search Subscriber",
    "Stock Overview"
  ];

  // All page names for search suggestions
  const tipKeys = allPages.map(page => page.name);

  const handleSearch = (searchValue: string) => {
    // Find matching page
    const matchedPage = allPages.find(page =>
      page.name.toLowerCase() === searchValue.toLowerCase()
    );

    if (matchedPage) {
      setLocation(matchedPage.path);
    } else {
      // Fallback to search subscriber page with search term
      setLocation(`/search-subscriber?q=${encodeURIComponent(searchValue)}`);
    }
  };

  const handlePageSelect = (path: string) => {
    setLocation(path);
  };

  const handleLogout = async () => {
    await logout();
    // The AuthProvider already handles redirecting to "/login", 
    // but an explicit redirect here is fine as a fallback.
    // setLocation('/login') would be the wouter way, but window.location.href is also fine.
    window.location.href = "/";
  };

  return (
    <div className="bg-azam-header shadow-sm border-b border-azam-header-dark">
      {/* SAP Fiori Shell Bar */}
      <div className="flex items-center justify-between h-14 px-3 sm:px-4">
        {/* Left side - Logo and Product Title */}
        <div className="flex items-center space-x-3 sm:space-x-4">
          <div className="flex items-center space-x-2">
            <img
              src={logo}
              alt="AZAM TV Logo"
              className="h-11 w-auto object-contain"
            />


            {/* Mobile Menu Button - SAP Fiori Style */}
            <div className="hidden sm:block h-5 w-px bg-white/20"></div>
            <span className="hidden sm:inline text-white text-sm font-medium">VAI</span>


          </div>
        </div>

        {/* Right side - Actions */}
        <div className="flex items-center space-x-1 sm:space-x-2">
          {/* Advanced Search Bar (Desktop) - SAP Fiori styled */}
          {/* <div className="hidden sm:flex relative">
            <div className="bg-white rounded border border-white">
              <AdvancedSearch
                hotKeys={hotKeys}
                tipKeys={tipKeys}
                allPages={allPages}
                onSearch={handleSearch}
                placeholder={t('common.search') + " " + t('nav.dashboard').toLowerCase() + "..."}
                className="w-[400px] bg-transparent border-none text-black placeholder:text-gray-700"
              />
            </div>
          </div> */}

          {/* Tanzania Time and Date */}
          <TanzaniaTime />



          {/* Notifications - Enhanced with NotificationCenter */}
          <NotificationCenter />

          {/* User Menu - SAP Fiori Style */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="flex items-center space-x-2 text-white hover:bg-azam-header-light px-2 h-8">
                <div className="w-6 h-6 bg-azam-orange rounded-full flex items-center justify-center border border-azam-orange">
                  <User className="h-3.5 w-3.5 text-white" />
                </div>
                <span className="hidden sm:inline text-xs text-white font-medium">{user?.username || "Admin User"}</span>
                <ChevronDown className="h-3 w-3 text-white/70" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48 mt-1 bg-white border border-gray-200 shadow-lg">
              <DropdownMenuItem
                className="cursor-pointer text-sm"
                onClick={() => setLocation('/profile')}
              >
                <User className="mr-2 h-4 w-4" />
                {/* {t('common.profile')} */}
                Profile
              </DropdownMenuItem>


              <DropdownMenuSeparator />
              <DropdownMenuItem className="cursor-pointer text-sm text-[#d53835] hover:bg-red-50" onClick={handleLogout}>
                <LogOut className="mr-2 h-4 w-4" />
                Logout
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Mobile Advanced Search Bar - SAP Fiori Style */}
      <div className="sm:hidden border-t border-azam-header-dark bg-azam-header">
        <div className="p-3">
          <div className="bg-white rounded border border-white">
            <AdvancedSearch
              hotKeys={hotKeys}
              tipKeys={tipKeys}
              allPages={allPages}
              onSearch={handleSearch}
              placeholder={"Search dashboard..."}
              className="w-full bg-transparent border-none text-black placeholder:text-gray-700"
            />
          </div>
        </div>
      </div>
    </div>
  );
}