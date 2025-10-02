import React, { useState, useMemo, useRef, useEffect } from 'react';
import { ChevronLeft, Check, Zap, Brain, Eye, Mic, MapPin, Search, ChevronDown } from 'lucide-react';
import { ModelProvider, Model } from '../../../types/aiConnection';

interface StepModelProps {
  provider: ModelProvider | undefined;
  onSelect: (modelId: string, selectedRegion?: string) => void;
  onBack: () => void;
}

interface CustomRegionSelectProps {
  regions: Array<{ id: string; name: string; displayName: string }>;
  selectedRegion: string;
  onRegionChange: (regionId: string) => void;
}

const CustomRegionSelect: React.FC<CustomRegionSelectProps> = ({ regions, selectedRegion, onRegionChange }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [dropdownPosition, setDropdownPosition] = useState<'bottom' | 'top'>('bottom');
  const dropdownRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const filteredRegions = useMemo(() => {
    if (!searchTerm) return regions;
    return regions.filter(region => 
      region.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      region.displayName.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [regions, searchTerm]);

  const selectedRegionData = regions.find(r => r.id === selectedRegion);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setSearchTerm('');
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (isOpen && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [isOpen]);

  useEffect(() => {
    if (isOpen && dropdownRef.current) {
      const rect = dropdownRef.current.getBoundingClientRect();
      const viewportHeight = window.innerHeight;
      const dropdownHeight = 320; // max-h-80 = 20rem = 320px
      
      // 드롭다운이 화면 하단에 잘릴 것 같으면 위쪽으로 열기
      if (rect.bottom + dropdownHeight > viewportHeight) {
        setDropdownPosition('top');
      } else {
        setDropdownPosition('bottom');
      }
    }
  }, [isOpen]);

  const handleRegionSelect = (regionId: string) => {
    onRegionChange(regionId);
    setIsOpen(false);
    setSearchTerm('');
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="px-3 py-2 pr-4 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors appearance-none cursor-pointer min-w-[280px] text-left flex items-center justify-between"
      >
        <span className="flex-1">{selectedRegionData?.name} ({selectedRegionData?.displayName})</span>
        <ChevronDown className={`w-4 h-4 text-gray-400 dark:text-gray-500 transition-transform flex-shrink-0 ml-1 ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className={`absolute left-0 right-0 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg shadow-lg z-50 max-h-80 overflow-hidden ${
          dropdownPosition === 'top' ? 'bottom-full mb-1' : 'top-full mt-1'
        }`}>
          {/* Search Input */}
          <div className="p-3 border-b border-gray-200 dark:border-gray-600">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400 dark:text-gray-500" />
              <input
                ref={searchInputRef}
                type="text"
                placeholder="Search regions..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>

          {/* Options List */}
          <div className="max-h-64 overflow-y-auto">
            {filteredRegions.length > 0 ? (
              filteredRegions.map((region) => (
                <button
                  key={region.id}
                  type="button"
                  onClick={() => handleRegionSelect(region.id)}
                  className={`w-full px-4 py-3 text-left text-sm hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors ${
                    region.id === selectedRegion 
                      ? 'bg-blue-50 dark:bg-blue-900 text-blue-700 dark:text-blue-300' 
                      : 'text-gray-900 dark:text-gray-100'
                  }`}
                >
                  <div className="font-medium">{region.name}</div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">{region.displayName}</div>
                </button>
              ))
            ) : (
              <div className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400 text-center">
                No regions found
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

const StepModel: React.FC<StepModelProps> = ({ provider, onSelect, onBack }) => {
  const [selectedRegion, setSelectedRegion] = useState<string>('us-east-1');
  const [searchTerm, setSearchTerm] = useState<string>('');
  
  if (!provider) return null;

  // AWS 프로바이더인 경우 리전별 모델 필터링
  const availableModels = useMemo(() => {
    if (provider.id === 'aws' && provider.supportedRegions) {
      return provider.models.filter(model => 
        !model.regions || model.regions.includes(selectedRegion)
      );
    }
    return provider.models;
  }, [provider, selectedRegion]);

  // 검색어에 따른 모델 필터링
  const filteredModels = useMemo(() => {
    if (!searchTerm.trim()) return availableModels;
    
    const searchLower = searchTerm.toLowerCase();
    return availableModels.filter(model => 
      model.name.toLowerCase().includes(searchLower) ||
      model.displayName.toLowerCase().includes(searchLower) ||
      model.description.toLowerCase().includes(searchLower) ||
      model.id.toLowerCase().includes(searchLower) ||
      model.tags?.some(tag => tag.toLowerCase().includes(searchLower))
    );
  }, [availableModels, searchTerm]);

  const getModelIcon = (model: Model) => {
    if (model.id.includes('gpt-4')) return <Brain className="w-5 h-5" />;
    if (model.id.includes('claude')) return <Eye className="w-5 h-5" />;
    if (model.id.includes('gemini')) return <Zap className="w-5 h-5" />;
    if (model.id.includes('cohere')) return <Mic className="w-5 h-5" />;
    return <Brain className="w-5 h-5" />;
  };

  const getModelCategory = (model: Model) => {
    if (model.id.includes('gpt-5')) return 'GPT-5 Series';
    if (model.id.includes('gpt-4')) return 'GPT-4 Series';
    if (model.id.includes('gpt-3.5')) return 'GPT-3.5 Series';
    if (model.id.includes('gpt-oss')) return 'OpenAI Series';
    if (model.id.includes('claude-sonnet-4') || model.id.includes('claude-opus-4')) return 'Claude 4 Series';
    if (model.id.includes('claude-3')) return 'Claude 3 Series';
    if (model.id.includes('claude-2')) return 'Claude 2 Series';
    if (model.id.includes('gemini-2.5')) return 'Gemini 2.5 Series';
    if (model.id.includes('gemini-2.0')) return 'Gemini 2.0 Series';
    if (model.id.includes('gemini-1.5')) return 'Gemini 1.5 Series';
    if (model.id.includes('gemini-pro')) return 'Gemini Pro Series';
    if (model.id.includes('gemini-flash')) return 'Gemini Flash Series';
    if (model.id.includes('cohere')) return 'Cohere Series';
    if (model.id.includes('anthropic')) return 'Anthropic Series';
    if (model.id.includes('amazon')) return 'Amazon Series';
    if (model.id.includes('meta')) return 'Meta Series';
    return 'Other';
  };

  const formatTokens = (tokens: number | undefined): string => {
    if (!tokens) return 'N/A';
    
    if (tokens >= 1000000) {
      return `${(tokens / 1000000).toFixed(1)}M`;
    } else if (tokens >= 1000) {
      return `${(tokens / 1000).toFixed(0)}K`;
    } else {
      return tokens.toString();
    }
  };

  const groupedModels = filteredModels.reduce((acc, model) => {
    const category = getModelCategory(model);
    if (!acc[category]) {
      acc[category] = [];
    }
    acc[category].push(model);
    return acc;
  }, {} as Record<string, Model[]>);

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <div className="text-center mb-8 animate-fadeIn">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-4">
          Select {provider.name} Model
        </h1>
        <p className="text-lg text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
          Choose the AI model that best fits your needs. Each model has different capabilities, 
          performance characteristics, and pricing.
        </p>
      </div>

      {/* Back Button */}
      <div className="mb-8 animate-fadeIn" style={{ animationDelay: '100ms' }}>
        <button
          onClick={onBack}
          className="flex items-center text-gray-600 dark:text-gray-300 hover:text-gray-800 dark:hover:text-gray-100 transition-colors"
        >
          <ChevronLeft className="w-5 h-5 mr-2" />
          Back to Provider Selection
        </button>
      </div>

      {/* Region Selector for AWS */}
      {provider.id === 'aws' && provider.supportedRegions && (
        <div className="mb-8 animate-fadeIn" style={{ animationDelay: '200ms' }}>
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
            <div className="flex items-center justify-center mb-4">
              <MapPin className="w-5 h-5 text-blue-500 mr-2" />
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                Select AWS Region
              </h3>
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-300 text-center mb-4">
              Choose your preferred AWS region. Available models may vary by region.
            </p>
            <div className="flex justify-center">
              <CustomRegionSelect
                regions={provider.supportedRegions}
                selectedRegion={selectedRegion}
                onRegionChange={setSelectedRegion}
              />
            </div>
          </div>
        </div>
      )}

      {/* Search Bar */}
      <div className="mb-8 animate-fadeIn" style={{ animationDelay: '300ms' }}>
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center justify-center mb-4">
            <Search className="w-5 h-5 text-blue-500 mr-2" />
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
              Search Models
            </h3>
          </div>
          <p className="text-sm text-gray-600 dark:text-gray-300 text-center mb-4">
            Search by model name, description, tags, or model ID
          </p>
          <div className="flex justify-center">
            <div className="relative w-full max-w-md">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400 dark:text-gray-500" />
              <input
                type="text"
                placeholder="Search models..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-3 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
              />
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm('')}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300"
                >
                  ✕
                </button>
              )}
            </div>
          </div>
          {searchTerm && (
            <div className="mt-4 text-center">
              <span className="text-sm text-gray-500 dark:text-gray-400">
                {filteredModels.length} model{filteredModels.length !== 1 ? 's' : ''} found
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Model Categories */}
      <div className="space-y-8">
        {Object.keys(groupedModels).length === 0 ? (
          <div className="text-center py-12 animate-fadeIn">
            <div className="w-16 h-16 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-4">
              <Search className="w-8 h-8 text-gray-400 dark:text-gray-500" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
              No models found
            </h3>
            <p className="text-gray-600 dark:text-gray-300 mb-4">
              {searchTerm 
                ? `No models match "${searchTerm}". Try a different search term.`
                : 'No models are available in the selected region.'
              }
            </p>
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
              >
                Clear Search
              </button>
            )}
          </div>
        ) : (
          <>
            {Object.entries(groupedModels)
            .sort(([a], [b]) => {
            // 카테고리 우선순위 정의
            const categoryOrder = [
              'GPT-5 Series',
              'GPT-4 Series', 
              'GPT-3.5 Series',
              'OpenAI Series',
              'Claude 4 Series',
              'Claude 3 Series',
              'Claude 2 Series',
              'Gemini 2.5 Series',
              'Gemini 2.0 Series',
              'Gemini 1.5 Series',
              'Gemini Pro Series',
              'Gemini Flash Series',
              'Cohere Series',
              'Anthropic Series',
              'Amazon Series',
              'Meta Series',
              'Other'
            ];
            const aIndex = categoryOrder.indexOf(a);
            const bIndex = categoryOrder.indexOf(b);
            return (aIndex === -1 ? 999 : aIndex) - (bIndex === -1 ? 999 : bIndex);
          })
          .map(([category, models], categoryIndex) => (
          <div key={category} className="animate-fadeIn" style={{ animationDelay: `${300 + categoryIndex * 100}ms` }}>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-4">{category}</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {models.map((model, index) => (
                <div
                  key={model.id}
                  onClick={() => {
                    if (provider.id === 'aws' && model.regions && !model.regions.includes(selectedRegion)) {
                      return; // 사용할 수 없는 모델은 클릭 무시
                    }
                    onSelect(model.id, provider.id === 'aws' ? selectedRegion : undefined);
                  }}
                  className={`group bg-white dark:bg-gray-800 rounded-xl border-2 p-6 transition-all duration-300 ${
                    provider.id === 'aws' && model.regions && !model.regions.includes(selectedRegion)
                      ? 'border-gray-200 dark:border-gray-700 opacity-50 cursor-not-allowed'
                      : 'border-gray-200 dark:border-gray-700 cursor-pointer hover:border-blue-500 dark:hover:border-blue-400 hover:shadow-lg transform hover:-translate-y-1'
                  }`}
                  style={{ animationDelay: `${400 + categoryIndex * 100 + index * 50}ms` }}
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                      {getModelIcon(model)}
                    </div>
                    <div className="text-right space-y-1">
                      <span className="inline-block px-2 py-1 text-xs font-medium bg-green-100 text-green-800 rounded-full">
                        {formatTokens(model.maxTokens)} tokens
                      </span>
                    </div>
                  </div>

                  <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                    {model.name}
                  </h3>
                  
                  <p className="text-sm text-gray-600 dark:text-gray-300 mb-4 line-clamp-2">
                    {model.description}
                  </p>

                  <div className="space-y-2 text-sm text-gray-500 dark:text-gray-400">
                    <div className="flex justify-between">
                      <span>Context Length:</span>
                      <span className="font-medium">{formatTokens(model.maxTokens)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Model ID:</span>
                      <span className="font-medium">{model.id}</span>
                    </div>
                    {provider.id === 'aws' && model.regions && (
                      <div className="flex justify-between">
                        <span>Available Regions:</span>
                        <span className="font-medium text-xs">
                          {model.regions.length} region{model.regions.length > 1 ? 's' : ''}
                        </span>
                      </div>
                    )}
                  </div>

                  {model.tags && model.tags.length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-2">
                      {model.tags.map(tag => (
                        <span key={tag} className="px-2 py-1 bg-blue-50 dark:bg-blue-900 text-blue-700 dark:text-blue-300 rounded-full text-xs font-medium">#{tag}</span>
                      ))}
                    </div>
                  )}

                  <div className="pt-2">
                    <div className="flex items-center justify-between">
                      <span className={`text-sm transition-colors duration-300 ${
                        provider.id === 'aws' && model.regions && !model.regions.includes(selectedRegion)
                          ? 'text-gray-400 dark:text-gray-500'
                          : 'text-gray-500 dark:text-gray-400 group-hover:text-gray-700 dark:group-hover:text-gray-100'
                      }`}>
                        {provider.id === 'aws' && model.regions && !model.regions.includes(selectedRegion)
                          ? 'Not available in this region'
                          : 'Click to select'
                        }
                      </span>
                      {!(provider.id === 'aws' && model.regions && !model.regions.includes(selectedRegion)) && (
                        <Check className="w-5 h-5 text-blue-500 dark:text-blue-400 opacity-0 group-hover:opacity-100 transition-all duration-300 transform group-hover:scale-110" />
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
          </>
        )}
      </div>

      {/* Footer */}
      <div className="text-center text-sm text-gray-500 dark:text-gray-400 animate-fadeIn" style={{ animationDelay: '800ms' }}>
        <p>After selecting a model, you'll enter authentication information in the next step</p>
      </div>
    </div>
  );
};

export default StepModel; 