import { Link, useLocation } from "wouter";
import { cn } from "@/lib/utils";
import {
  BarChart3, Users, Package, UserPlus, CreditCard, Calendar, FileText, Tv
} from "lucide-react";
import { useAuth } from "@/hooks/use-auth";

const mapIconStringToComponent = (iconName?: string) => {
  switch (iconName) {
    case "pi pi-home": return BarChart3;
    case "pi pi-user-plus": return UserPlus;
    case "pi pi-box": return Package;
    case "pi pi-dollar": return CreditCard;
    case "pi pi-id-card": return Calendar;
    case "pi pi-sliders-h": return FileText;
    default: return BarChart3;
  }
};

export default function Sidebar() {
  const [location] = useLocation();
  const { user } = useAuth();
  const navsidebarItems = user?.menuDetails?.menus?.NAV || [];
  const sectionsidebarItems = user?.menuDetails?.menus?.SECTION || [];

  return (
    <div className="w-64 bg-white shadow-lg flex-shrink-0">
      <div className="p-6 border-b">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-azam-blue rounded-lg flex items-center justify-center">
            <Tv className="h-6 w-6 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-azam-dark">AZAM TV</h1>
            <p className="text-sm text-gray-500">Portal</p>
          </div>
        </div>
      </div>

      <nav className="p-4">
        <ul className="space-y-2">
          {navsidebarItems.map((item: any) => {
            const Icon = mapIconStringToComponent(item.pageMenuIcon);
            const isActive = location === item.pageUrl;
            // Find matching SECTIONs for this nav item
            const subSections = sectionsidebarItems.filter(
              (section: any) => section.pageSectionName === item.pageMenu
            );
            return (
              <li key={item.pageMenu}>
                <Link href={item.pageUrl}>
                  <a
                    className={cn(
                      "nav-link flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors",
                      isActive && "active"
                    )}
                  >
                    {Icon && <Icon className="h-5 w-5" />}
                    <span>{item.pageMenu}</span>
                  </a>
                </Link>
                {subSections.length > 0 && (
                  <ul className="ml-8 mt-1 space-y-1">
                    {subSections.map((sub: any) => (
                      <li key={sub.pageMenu}>
                        <Link href={sub.pageUrl}>
                          <a className={cn(
                            "text-sm text-gray-600 hover:text-azam-blue transition-colors",
                            location === sub.pageUrl && "font-semibold text-azam-blue"
                          )}>
                            {sub.pageMenu}
                          </a>
                        </Link>
                      </li>
                    ))}
                  </ul>
                )}
              </li>
            );
          })}
        </ul>
      </nav>
    </div>
  );
}