import React from 'react';
import { ArrowRight } from 'lucide-react';

interface ProviderCard {
  id: string;
  name: string;
  logo: string;
  description: string;
  modelCount: number;
  color: string;
  textColor: string;
  iconColor: string;
}

interface StepProviderProps {
  providers: ProviderCard[];
  onSelect: (providerId: string) => void;
}

const StepProvider: React.FC<StepProviderProps> = ({ providers, onSelect }) => {
  return (
    <div className="space-y-8 animate-fadeIn">
      <div className="text-center animate-bounceIn">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">
          Select AI Model Provider
        </h2>
        <p className="text-gray-600 dark:text-gray-300">
          Choose the AI model provider you want to use
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {providers.map((provider, index) => (
          <div
            key={provider.id}
            className={`${provider.color} dark:bg-gray-800 dark:border-gray-700 border-2 rounded-xl p-6 cursor-pointer transform transition-all duration-300 hover:scale-105 hover:shadow-lg group animate-scaleIn`}
            style={{
              animationDelay: `${index * 150}ms`,
            }}
            onClick={() => onSelect(provider.id)}
          >
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center mb-4">
                  <span className={`text-3xl mr-3 ${provider.iconColor} transition-transform duration-300 group-hover:scale-110`}>
                    {provider.logo}
                  </span>
                  <div>
                    <h3 className={`text-xl font-semibold ${provider.textColor} dark:text-gray-100 mb-1 transition-colors duration-300`}>
                      {provider.name}
                    </h3>
                    <div className="flex items-center text-sm text-gray-600 dark:text-gray-300">
                      <span className="bg-white dark:bg-gray-900 px-2 py-1 rounded-full text-xs font-medium transition-all duration-300 group-hover:bg-opacity-90">
                        {provider.modelCount} models
                      </span>
                    </div>
                  </div>
                </div>
                
                <p className="text-gray-700 dark:text-gray-300 mb-4 leading-relaxed transition-colors duration-300 group-hover:text-gray-800 dark:group-hover:text-gray-100">
                  {provider.description}
                </p>

                <div className="flex items-center justify-between">
                  <div className="text-sm text-gray-600 dark:text-gray-300 transition-colors duration-300 group-hover:text-gray-700 dark:group-hover:text-gray-100">
                    Click to select
                  </div>
                  <ArrowRight 
                    className={`w-5 h-5 ${provider.textColor} dark:text-gray-100 opacity-0 group-hover:opacity-100 transform group-hover:translate-x-1 transition-all duration-300`} 
                  />
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="text-center text-sm text-gray-500 dark:text-gray-400 mt-8 animate-fadeIn" style={{ animationDelay: '600ms' }}>
        <p>Each provider offers unique models and capabilities</p>
      </div>
    </div>
  );
};

export default StepProvider; 