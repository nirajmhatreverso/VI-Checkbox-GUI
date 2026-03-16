import { useState, useEffect, useRef } from "react";
import { Search, X, Clock, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useLocation } from "wouter";


interface SearchData {
  value: string;
  tipKeys: string[];
  hotKeys: string[];
  history: string[];
  showResults: boolean;
}

interface PageItem {
  name: string;
  path: string;
  category: string;
}

interface AdvancedSearchProps {
  hotKeys?: string[];
  tipKeys?: string[];
  allPages?: PageItem[];
  onSearch: (value: string) => void;
  onBack?: () => void;
  placeholder?: string;
  className?: string;
}

export default function AdvancedSearch({
  hotKeys = [],
  tipKeys = [],
  allPages = [],
  onSearch,
  onBack,
  placeholder = "Search pages...",
  className = ""
}: AdvancedSearchProps) {
  const [, setLocation] = useLocation();

  const inputRef = useRef<HTMLInputElement>(null);

  const [searchData, setSearchData] = useState<SearchData>({
    value: "",
    tipKeys: [],
    hotKeys: hotKeys,
    history: [],
    showResults: false
  });

  // Load search history from localStorage
  useEffect(() => {
    try {
      const savedHistory = localStorage.getItem('azamSearchHistory');
      if (savedHistory) {
        const history = JSON.parse(savedHistory);
        setSearchData(prev => ({ ...prev, history }));
      }
    } catch (error) {

    }
  }, []);

  // Update hot keys when prop changes
  useEffect(() => {
    setSearchData(prev => ({ ...prev, hotKeys }));
  }, [hotKeys]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const inputValue = e.target.value;

    // Find matching tip keys
    const matchingTips = tipKeys.filter(tip =>
      tip.toLowerCase().includes(inputValue.toLowerCase())
    );

    setSearchData(prev => ({
      ...prev,
      value: inputValue,
      tipKeys: matchingTips,
      showResults: true // Always show results when typing or focused
    }));
  };

  const handleInputFocus = () => {
    setSearchData(prev => ({
      ...prev,
      showResults: true
    }));
  };

  const handleInputBlur = () => {
    // Delay hiding to allow for clicks on results
    setTimeout(() => {
      setSearchData(prev => ({
        ...prev,
        showResults: false
      }));
    }, 200);
  };

  const handleSearch = (value: string) => {
    if (value && value.trim().length > 0) {
      const trimmedValue = value.trim();

      // Add to search history
      addToHistory(trimmedValue);

      // Update search data
      setSearchData(prev => ({
        ...prev,
        value: trimmedValue,
        showResults: false
      }));

      // Call search callback
      onSearch(trimmedValue);
    }
  };

  const addToHistory = (searchTerm: string) => {
    try {
      let history = [...searchData.history];

      // Remove if already exists
      history = history.filter(item => item !== searchTerm);

      // Add to beginning
      history.unshift(searchTerm);

      // Keep only last 10 searches
      history = history.slice(0, 10);

      // Save to localStorage
      localStorage.setItem('azamSearchHistory', JSON.stringify(history));

      // Update state
      setSearchData(prev => ({ ...prev, history }));
    } catch (error) {

    }
  };

  const clearHistory = () => {
    try {
      localStorage.removeItem('azamSearchHistory');
      setSearchData(prev => ({ ...prev, history: [] }));
    } catch (error) {

    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch(searchData.value);
    }
  };

  const handleClear = () => {
    setSearchData(prev => ({
      ...prev,
      value: "",
      tipKeys: [],
      showResults: false
    }));
    inputRef.current?.focus();
  };

  const handleKeyTap = (key: string) => {
    handleSearch(key);
  };

  const handleConfirm = () => {
    if (searchData.value.length > 0) {
      handleSearch(searchData.value);
    } else if (onBack) {
      onBack();
    }
  };

  return (
    <div className={`relative ${className}`}>
      {/* SAP Fiori Search Bar */}
      <div className="flex items-center bg-white/90 rounded border border-white h-8">
        <div className="flex-1 relative">
          <div className="relative">
            <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 h-3.5 w-3.5 text-gray-600" />
            <Input
              ref={inputRef}
              type="text"
              placeholder={placeholder}
              value={searchData.value}
              onChange={handleInputChange}
              onFocus={handleInputFocus}
              onBlur={handleInputBlur}
              onKeyPress={handleKeyPress}
              className="pl-8 pr-8 border-0 bg-transparent focus:ring-0 focus:outline-none text-black placeholder:text-gray-600 text-sm h-6"
            />
            {searchData.value.length > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleClear}
                className="absolute right-1 top-1/2 transform -translate-y-1/2 h-5 w-5 p-0 hover:bg-gray-100 text-gray-600"
              >
                <X className="h-3 w-3" />
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* SAP Fiori Search Results Overlay */}
      {searchData.showResults && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-[#e5e5e5] rounded shadow-lg z-50 max-h-96 overflow-y-auto">

          {/* Search Suggestions when typing - SAP Fiori Style */}
          {searchData.tipKeys.length > 0 && searchData.value.length > 0 && (
            <div className="border-b border-[#e5e5e5]">
              <div className="px-3 py-2 bg-[#f7f7f7] border-b border-[#e5e5e5]">
                <span className="text-xs font-medium text-[#32363a]">
                  Search Results
                </span>
              </div>
              {searchData.tipKeys.map((tip, index) => (
                <button
                  key={index}
                  onClick={() => handleKeyTap(tip)}
                  className="w-full px-3 py-2 text-left text-sm hover:bg-[#f7f7f7] flex items-center space-x-2 border-b border-[#f0f0f0] last:border-b-0 text-[#32363a]"
                >
                  <Search className="h-3.5 w-3.5 text-[#6a6d70]" />
                  <span>{tip}</span>
                </button>
              ))}
            </div>
          )}

          {/* All Pages organized by category - SAP Fiori Style */}
          {searchData.value.length === 0 && allPages.length > 0 && (
            <div>
              {Array.from(new Set(allPages.map(page => page.category))).map(category => {
                const categoryPages = allPages.filter(page => page.category === category);
                return (
                  <div key={category} className="border-b border-[#e5e5e5] last:border-b-0">
                    <div className="px-3 py-2 bg-[#f7f7f7] border-b border-[#e5e5e5]">
                      <span className="text-xs font-medium text-[#32363a]">
                        {category}
                      </span>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-0">
                      {categoryPages.map((page, index) => (
                        <button
                          key={`${category}-${index}`}
                          onClick={() => handleKeyTap(page.name)}
                          className="w-full px-3 py-2 text-left text-sm hover:bg-[#f7f7f7] text-[#32363a] border-b border-[#f0f0f0] last:border-b-0 md:border-b-0 md:border-r md:last:border-r-0"
                        >
                          {page.name}
                        </button>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Search History - SAP Fiori Style */}
          {searchData.history.length > 0 && searchData.value.length === 0 && allPages.length === 0 && (
            <div>
              <div className="flex items-center justify-between px-3 py-2 bg-[#f7f7f7] border-b border-[#e5e5e5]">
                <div className="flex items-center space-x-2">
                  <Clock className="h-3.5 w-3.5 text-[#6a6d70]" />
                  <span className="text-xs font-medium text-[#32363a]">
                    Search History
                  </span>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={clearHistory}
                  className="text-[#6a6d70] hover:text-[#d53835] p-1 h-6 w-6"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
              <div className="border-b border-[#e5e5e5]">
                {searchData.history.map((item, index) => (
                  <button
                    key={index}
                    onClick={() => handleKeyTap(item)}
                    className="w-full px-3 py-2 text-left text-sm hover:bg-[#f7f7f7] text-[#32363a] border-b border-[#f0f0f0] last:border-b-0"
                  >
                    {item}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Hot Keys - SAP Fiori Style */}
          {searchData.hotKeys.length > 0 && searchData.value.length === 0 && allPages.length === 0 && (
            <div>
              <div className="px-3 py-2 bg-[#f7f7f7] border-b border-[#e5e5e5]">
                <span className="text-xs font-medium text-[#32363a]">
                  Popular Searches
                </span>
              </div>
              <div className="p-2">
                <div className="flex flex-wrap gap-1.5">
                  {searchData.hotKeys.map((hotKey, index) => (
                    <button
                      key={index}
                      onClick={() => handleKeyTap(hotKey)}
                      className="px-2 py-1 text-xs bg-[#f7f7f7] text-[#32363a] border border-[#e5e5e5] rounded hover:bg-[#0a6ed1] hover:text-white hover:border-[#0a6ed1] transition-colors"
                    >
                      {hotKey}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}