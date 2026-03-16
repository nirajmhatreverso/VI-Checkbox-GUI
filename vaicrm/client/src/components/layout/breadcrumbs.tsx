import { useMemo } from "react";
import { useLocation } from "wouter";
import { Monitor, ChevronRight, User } from "lucide-react";


interface BreadcrumbItem {
  name: string;
  path: string;
  icon?: React.ComponentType<{ className?: string }>;
}

export default function Breadcrumbs() {
  const [location, setLocation] = useLocation();


  // Define the hierarchical structure of all pages
  const pageHierarchy = useMemo(() => {
    const hierarchy: Record<string, BreadcrumbItem[]> = {
      // Dashboard (now the root)
      "/": [
        { name: "Dashboard", path: "/", icon: Monitor }
      ],

      "/dashboard": [
        { name: "Dashboard", path: "/", icon: Monitor }
      ],

      // Onboarding Section

      "/agent-onboarding": [
        { name: "Dashboard", path: "/" },
        //{ name: "Onboarding", path: "/onboarding" },
        { name: "Agent Onboarding", path: "/agent-onboarding" }
      ],
      "/kyc-approval": [
        { name: "Dashboard", path: "/" },
        { name: "KYC Approval", path: "/kyc-approval" }
      ],
      "/customer-registration": [
        { name: "Dashboard", path: "/" },
        // { name: "Onboarding", path: "/onboarding" },
        { name: "Customer Registration", path: "/customer-registration" }
      ],
      "/profile": [
        { name: "Dashboard", path: "/" },
        { name: "Profile", path: "/profile", icon: User }
      ],

      // Inventory Section


      "/stock-overview": [
        { name: "Dashboard", path: "/" },

        { name: "Stock Overview", path: "/stock-overview" }
      ],
      "/stock-request": [
        { name: "Dashboard", path: "/" },

        { name: "Stock Request", path: "/stock-request" }
      ],
      "/stock-approval": [
        { name: "Dashboard", path: "/" },

        { name: "Stock Approval", path: "/stock-approval" }
      ],
      "/stock-transfer": [
        { name: "Dashboard", path: "/" },

        { name: "Stock Transfer", path: "/stock-transfer" }
      ],
      "/track-serial": [
        { name: "Dashboard", path: "/" },

        { name: "Track Serial", path: "/track-serial" }
      ],
      "/cas-id-change": [
        { name: "Dashboard", path: "/" },

        { name: "CAS ID Change", path: "/cas-id-change" }
      ],
      "/stb-sc-pairing": [
        { name: "Dashboard", path: "/" },

        { name: "STB-SC Pairing", path: "/stb-sc-pairing" }
      ],
      "/warehouse-transfer": [
        { name: "Dashboard", path: "/" },

        { name: "Warehouse Transfer", path: "/warehouse-transfer" }
      ],
      "/block-unblock-agent": [
        { name: "Dashboard", path: "/" },

        { name: "Block/Unblock Agent", path: "/block-unblock-agent" }
      ],
      "/block-unblock-center": [
        { name: "Dashboard", path: "/" },

        { name: "Block/Unblock Center", path: "/block-unblock-center" }
      ],
      "/po-grn-update": [
        { name: "Dashboard", path: "/" },

        { name: "PO GRN Update", path: "/po-grn-update" }
      ],
      "/po-view": [
        { name: "Dashboard", path: "/" },

        { name: "PO View", path: "/po-view" }
      ],
      "/customer-hardware-return": [
        { name: "Dashboard", path: "/" },

        { name: "Customer Hardware Return", path: "/customer-hardware-return" }
      ],
      "/agent-replacement": [
        { name: "Dashboard", path: "/" },

        { name: "Agent Replacement", path: "/agent-replacement" }
      ],
      "/agent-faulty-repair": [
        { name: "Dashboard", path: "/" },

        { name: "Agent Faulty Repair", path: "/agent-faulty-repair" }
      ],
      "/agent-subagent": [
        { name: "Dashboard", path: "/" },

        { name: "Agent to Sub agent transfer", path: "/agent-subagent" }
      ],
      "/subagent-agent-transfer": [
        { name: "Dashboard", path: "/" },

        { name: "Sub agent to Agent transfer", path: "/subagent-agent-transfer" }
      ],

      // Payments Section
      "/agent-payment-hw": [
        { name: "Dashboard", path: "/" },

        { name: "Agent Payment HW", path: "/agent-payment-hw" }
      ],
      "/agent-hardware-sale": [
        { name: "Dashboard", path: "/" },

        { name: "Agent Hardware Sale", path: "/agent-hardware-sale" }
      ],
      "/customer-hardware-sale": [
        { name: "Dashboard", path: "/" },

        { name: "Customer Hardware Sale", path: "/customer-hardware-sale" }
      ],
      "/customer-payment-hw": [
        { name: "Dashboard", path: "/" },

        { name: "Customer Payment HW", path: "/customer-payment-hw" }
      ],



      // Subscriptions Section

      "/subscription-purchase": [
        { name: "Dashboard", path: "/" },
        { name: "Subscription Purchase", path: "/subscription-purchase" }
      ],
      "/subscription-renewal": [
        { name: "Dashboard", path: "/" },
        { name: "Subscription Renewal", path: "/subscription-renewal" }
      ],
      "/plan-change": [
        { name: "Dashboard", path: "/" },
        { name: "Plan Change", path: "/plan-change" }
      ],
      "/offer-change": [
        { name: "Dashboard", path: "/" },
        { name: "Offer Change", path: "/offer-change" }
      ],
      "/plan-validity-extension": [
        { name: "Dashboard", path: "/" },
        { name: "Plan Validity Extension", path: "/plan-validity-extension" }
      ],
      "/add-addon-packs": [
        { name: "Dashboard", path: "/" },
        { name: "Add Addon Packs", path: "/add-addon-packs" }
      ],
      "/customer-suspension": [
        { name: "Dashboard", path: "/" },
        { name: "Customer Suspension", path: "/customer-suspension" }
      ],
      "/customer-disconnection": [
        { name: "Dashboard", path: "/" },
        { name: "Customer Disconnection", path: "/customer-disconnection" }
      ],
      "/termination": [
        { name: "Dashboard", path: "/" },
        { name: "Termination", path: "/termination" }
      ],
      "/replacement": [
        { name: "Dashboard", path: "/" },
        { name: "Replacement", path: "/replacement" }
      ],
      "/reconnection": [
        { name: "Dashboard", path: "/" },
        { name: "Reconnection", path: "/reconnection" }
      ],
      "/search-subscriber": [
        { name: "Dashboard", path: "/" },
        { name: "Search Subscriber", path: "/search-subscriber" }
      ],

      // Operations Section
      "/service-ticketing": [
        { name: "Dashboard", path: "/" },
        { name: "Service Ticketing", path: "/service-ticketing" }
      ],
      "/bulk-provision": [
        { name: "Dashboard", path: "/" },
        { name: "Bulk Provision", path: "/bulk-provision" }
      ],
      "/provisioning": [
        { name: "Dashboard", path: "/" },
        { name: "Provisioning", path: "/provisioning" }
      ],
      "/reports": [
        { name: "Dashboard", path: "/" },
        { name: "Reports", path: "/reports" }
      ],

      // Admin Section
      "/menu-master": [
        { name: "Dashboard", path: "/" },
        { name: "Menu Master", path: "/menu-master" }
      ],
      "/role-master": [
        { name: "Dashboard", path: "/" },
        { name: "Role Master", path: "/role-master" }
      ],
      "/survey-form": [
        { name: "Dashboard", path: "/" },
        { name: "Survey Form", path: "/survey-form" }
      ],
      "/announcements": [
        { name: "Dashboard", path: "/" },
        { name: "Announcements", path: "/announcements" }
      ]
    };

    return hierarchy;
  }, []);

  const currentBreadcrumbs = pageHierarchy[location] || [
    { name: "Dashboard", path: "/", icon: Monitor }
  ];

  // Don't show breadcrumbs for home page
  if (location === "/" || currentBreadcrumbs.length <= 1) {
    return null;
  }

  return (
    <div className="bg-white/80 backdrop-blur-sm border-b border-azam-blue/30 px-3 sm:px-4 py-2">
      <nav
        className="flex items-center text-sm text-gray-600 overflow-x-auto"
        aria-label={'Breadcrumbs'}
      >
        <ol className="flex items-center space-x-2">
          {currentBreadcrumbs.map((crumb, index) => {
            const Icon = crumb.icon;
            const isLast = index === currentBreadcrumbs.length - 1;

            return (
              <li key={crumb.path} className="flex items-center">
                {!isLast ? (
                  <a
                    href={crumb.path}
                    onClick={(e) => {
                      e.preventDefault();
                      setLocation(crumb.path);
                    }}
                    className="inline-flex items-center text-sm text-azam-blue hover:underline focus:outline-none focus:ring-2 focus:ring-azam-blue/20 rounded"
                    title={crumb.name}
                  >
                    {index === 0 && Icon && (
                      <Icon className="h-4 w-4 mr-2 flex-shrink-0 text-azam-blue" />
                    )}
                    <span className="truncate max-w-[140px]">{crumb.name}</span>
                  </a>
                ) : (
                  <span
                    className="inline-flex items-center text-sm text-gray-900 font-semibold"
                    aria-current="page"
                    title={crumb.name}
                  >
                    {index === 0 && Icon && (
                      <Icon className="h-4 w-4 mr-2 flex-shrink-0 text-azam-blue" />
                    )}
                    <span className="truncate max-w-[280px]">{crumb.name}</span>
                  </span>
                )}

                {index < currentBreadcrumbs.length - 1 && (
                  <ChevronRight className="h-4 w-4 text-gray-400 mx-2 flex-shrink-0" aria-hidden />
                )}
              </li>
            );
          })}
        </ol>
      </nav>
    </div>
  );
}