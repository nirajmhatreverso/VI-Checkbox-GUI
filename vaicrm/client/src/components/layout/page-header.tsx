import { useLocation } from "wouter";
import { ArrowLeft, Home } from "lucide-react";

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  breadcrumbs?: Array<{ name: string; path?: string }>;
}

export default function PageHeader({ title, subtitle, breadcrumbs }: PageHeaderProps) {
  const [, navigate] = useLocation();

  return (
    <div className="sap-header">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <button
            onClick={() => navigate("/")}
            className="flex items-center space-x-2 text-blue-600 hover:text-blue-800 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="text-sm font-medium">Back to Home</span>
          </button>
          <div className="h-4 w-px bg-gray-300"></div>
          <h1 className="text-xl font-semibold text-gray-900">{title}</h1>
        </div>
        <div className="flex items-center space-x-4">
          <Home className="w-5 h-5 text-gray-400" />
        </div>
      </div>
      
      {subtitle && (
        <p className="text-sm text-gray-600 mt-2">{subtitle}</p>
      )}
      
      {breadcrumbs && (
        <div className="sap-breadcrumb mt-2">
          {breadcrumbs.map((crumb, index) => (
            <span key={index}>
              {crumb.path ? (
                <a href="#" onClick={() => navigate(crumb.path!)} className="text-blue-600 hover:text-blue-800">
                  {crumb.name}
                </a>
              ) : (
                <span>{crumb.name}</span>
              )}
              {index < breadcrumbs.length - 1 && <span className="mx-1">&gt;</span>}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}