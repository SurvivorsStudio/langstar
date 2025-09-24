import React from 'react';
import { ChevronLeft, Check, Zap, Brain, Eye, Mic } from 'lucide-react';
import { ModelProvider, Model } from '../../../types/aiConnection';

interface StepModelProps {
  provider: ModelProvider | undefined;
  onSelect: (modelId: string) => void;
  onBack: () => void;
}

const StepModel: React.FC<StepModelProps> = ({ provider, onSelect, onBack }) => {
  if (!provider) return null;

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
    if (model.id.includes('claude-3')) return 'Claude 3 Series';
    if (model.id.includes('claude-2')) return 'Claude 2 Series';
    if (model.id.includes('gemini-pro')) return 'Gemini Pro Series';
    if (model.id.includes('gemini-flash')) return 'Gemini Flash Series';
    if (model.id.includes('cohere')) return 'Cohere Series';
    if (model.id.includes('anthropic')) return 'Anthropic Series';
    if (model.id.includes('amazon')) return 'Amazon Series';
    if (model.id.includes('meta')) return 'Meta Series';
    return 'Other';
  };

  const groupedModels = provider.models.reduce((acc, model) => {
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
      <div className="mb-8 animate-fadeIn" style={{ animationDelay: '200ms' }}>
        <button
          onClick={onBack}
          className="flex items-center text-gray-600 dark:text-gray-300 hover:text-gray-800 dark:hover:text-gray-100 transition-colors"
        >
          <ChevronLeft className="w-5 h-5 mr-2" />
          Back to Provider Selection
        </button>
      </div>

      {/* Model Categories */}
      <div className="space-y-8">
        {Object.entries(groupedModels)
          .sort(([a], [b]) => {
            // 카테고리 우선순위 정의
            const categoryOrder = [
              'GPT-5 Series',
              'GPT-4 Series', 
              'GPT-3.5 Series',
              'Claude 3 Series',
              'Claude 2 Series',
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
                  onClick={() => onSelect(model.id)}
                  className="group bg-white dark:bg-gray-800 rounded-xl border-2 border-gray-200 dark:border-gray-700 p-6 cursor-pointer hover:border-blue-500 dark:hover:border-blue-400 hover:shadow-lg transition-all duration-300 transform hover:-translate-y-1"
                  style={{ animationDelay: `${400 + categoryIndex * 100 + index * 50}ms` }}
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                      {getModelIcon(model)}
                    </div>
                    <div className="text-right">
                      <span className="inline-block px-2 py-1 text-xs font-medium bg-green-100 text-green-800 rounded-full">
                        {model.maxTokens?.toLocaleString() || 'N/A'} tokens
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
                      <span className="font-medium">{model.maxTokens?.toLocaleString() || 'N/A'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Model ID:</span>
                      <span className="font-medium">{model.id}</span>
                    </div>
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
                      <span className="text-sm text-gray-500 dark:text-gray-400 transition-colors duration-300 group-hover:text-gray-700 dark:group-hover:text-gray-100">
                        Click to select
                      </span>
                      <Check className="w-5 h-5 text-blue-500 dark:text-blue-400 opacity-0 group-hover:opacity-100 transition-all duration-300 transform group-hover:scale-110" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Footer */}
      <div className="text-center text-sm text-gray-500 dark:text-gray-400 animate-fadeIn" style={{ animationDelay: '800ms' }}>
        <p>After selecting a model, you'll enter authentication information in the next step</p>
      </div>
    </div>
  );
};

export default StepModel; 