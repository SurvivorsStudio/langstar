import React from 'react';
import { Brain, Database, ArrowRight } from 'lucide-react';

interface StepTypeProps {
  onSelect: (type: 'language' | 'embedding') => void;
}

const StepType: React.FC<StepTypeProps> = ({ onSelect }) => {
  const modelTypes = [
    {
      id: 'language',
      name: 'Language Model',
      description: 'Text generation, conversation, and reasoning capabilities',
      icon: Brain,
      color: 'bg-purple-50 border-purple-200 hover:bg-purple-100',
      textColor: 'text-purple-700',
      iconColor: 'text-purple-600',
      features: ['Text Generation', 'Conversation', 'Code Generation', 'Reasoning']
    },
    {
      id: 'embedding',
      name: 'Embedding Model',
      description: 'Convert text to numerical vectors for similarity search',
      icon: Database,
      color: 'bg-green-50 border-green-200 hover:bg-green-100',
      textColor: 'text-green-700',
      iconColor: 'text-green-600',
      features: ['Text Embedding', 'Similarity Search', 'Vector Database', 'RAG Systems']
    }
  ];

  return (
    <div className="space-y-8 animate-fadeIn">
      <div className="text-center animate-bounceIn">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          Select Model Type
        </h2>
        <p className="text-gray-600">
          Choose the type of AI model you want to configure
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {modelTypes.map((type, index) => {
          const IconComponent = type.icon;
          return (
            <div
              key={type.id}
              className={`${type.color} border-2 rounded-xl p-6 cursor-pointer transform transition-all duration-300 hover:scale-105 hover:shadow-lg group animate-scaleIn`}
              style={{
                animationDelay: `${index * 150}ms`,
              }}
              onClick={() => onSelect(type.id as 'language' | 'embedding')}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center mb-4">
                    <div className={`w-12 h-12 ${type.iconColor} bg-white rounded-lg flex items-center justify-center mr-3 transition-transform duration-300 group-hover:scale-110`}>
                      <IconComponent className="w-6 h-6" />
                    </div>
                    <div>
                      <h3 className={`text-xl font-semibold ${type.textColor} mb-1 transition-colors duration-300`}>
                        {type.name}
                      </h3>
                    </div>
                  </div>
                  
                  <p className="text-gray-700 mb-4 leading-relaxed transition-colors duration-300 group-hover:text-gray-800">
                    {type.description}
                  </p>

                  <div className="mb-4">
                    <h4 className="text-sm font-medium text-gray-600 mb-2">Key Features:</h4>
                    <div className="flex flex-wrap gap-1">
                      {type.features.map((feature, featureIndex) => (
                        <span
                          key={featureIndex}
                          className="inline-block px-2 py-1 text-xs font-medium bg-white rounded-full text-gray-600 transition-all duration-300 group-hover:bg-opacity-90"
                        >
                          {feature}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="text-sm text-gray-600 transition-colors duration-300 group-hover:text-gray-700">
                      Click to select
                    </div>
                    <ArrowRight 
                      className={`w-5 h-5 ${type.textColor} opacity-0 group-hover:opacity-100 transform group-hover:translate-x-1 transition-all duration-300`} 
                    />
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="text-center text-sm text-gray-500 mt-8 animate-fadeIn" style={{ animationDelay: '600ms' }}>
        <p>Choose the model type that best fits your use case</p>
      </div>
    </div>
  );
};

export default StepType; 