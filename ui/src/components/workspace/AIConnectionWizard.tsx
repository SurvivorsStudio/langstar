import React, { useState, useEffect } from 'react';
import { ChevronLeft, Check } from 'lucide-react';
import { AIConnectionForm, AIConnection } from '../../types/aiConnection';
import { LANGUAGE_MODEL_PROVIDERS, EMBEDDING_MODEL_PROVIDERS, PROVIDER_CARDS, EMBEDDING_PROVIDER_CARDS } from '../../data/modelProviders';
import StepType from './wizard/StepType';
import StepProvider from './wizard/StepProvider';
import StepModel from './wizard/StepModel';
import StepAuth from './wizard/StepAuth';
import StepReview from './wizard/StepReview';

interface AIConnectionWizardProps {
  onBack: () => void;
  onSave: (form: AIConnectionForm) => void;
  activeMenu: string;
  editingConnection?: AIConnection | null; // To handle editing existing connection
}

const AIConnectionWizard: React.FC<AIConnectionWizardProps> = ({
  onBack,
  onSave,
  activeMenu,
  editingConnection,
}) => {
  const [currentStep, setCurrentStep] = useState(1);
  const [selectedType, setSelectedType] = useState<'language' | 'embedding' | null>(null);
  const [selectedProvider, setSelectedProvider] = useState<string>('');
  const [selectedModel, setSelectedModel] = useState<string>('');
  const [selectedRegion, setSelectedRegion] = useState<string>('');
  const [formData, setFormData] = useState<AIConnectionForm>({
    name: '',
    provider: '',
    model: '',
    apiKey: '',
    accessKeyId: '',
    secretAccessKey: '',
    region: '',
    status: 'active',
  });

  const isUnifiedView = activeMenu === 'ai-model-config';

  useEffect(() => {
    if (editingConnection) {
      const providerId = editingConnection.provider.toLowerCase();
      setFormData({
        name: editingConnection.name,
        provider: providerId,
        model: editingConnection.model,
        apiKey: editingConnection.apiKey || '',
        accessKeyId: editingConnection.accessKeyId || '',
        secretAccessKey: editingConnection.secretAccessKey || '',
        region: editingConnection.region || '',
        status: editingConnection.status as 'active' | 'draft' | 'archived',
      });
      setSelectedProvider(providerId);
      setSelectedModel(editingConnection.model);
      setSelectedType(editingConnection.type);
    } else if (isUnifiedView) {
      setCurrentStep(1);
    } else {
      setSelectedType(activeMenu === 'ai-language' ? 'language' : 'embedding');
      setCurrentStep(1);
    }
  }, [editingConnection, activeMenu, isUnifiedView]);

  useEffect(() => {
    if (editingConnection && selectedType && selectedProvider && selectedModel) {
      setCurrentStep(isUnifiedView ? 5 : 4);
    }
  }, [editingConnection, selectedType, selectedProvider, selectedModel, isUnifiedView]);

  const steps = isUnifiedView ? [
    { id: 1, title: 'Select Type', description: 'Choose language or embedding model' },
    { id: 2, title: 'Select Provider', description: 'Choose your AI model provider' },
    { id: 3, title: 'Select Model', description: 'Choose the model you want to use' },
    { id: 4, title: 'Authentication', description: 'Enter API keys and credentials' },
    { id: 5, title: 'Review & Save', description: 'Review configuration and save' },
  ] : [
    { id: 1, title: 'Select Provider', description: 'Choose your AI model provider' },
    { id: 2, title: 'Select Model', description: 'Choose the model you want to use' },
    { id: 3, title: 'Authentication', description: 'Enter API keys and credentials' },
    { id: 4, title: 'Review & Save', description: 'Review configuration and save' },
  ];

  const handleTypeSelect = (type: 'language' | 'embedding') => {
    setSelectedType(type);
    setFormData(prev => ({ ...prev, provider: '', model: '' }));
    setSelectedProvider('');
    setSelectedModel('');
    setCurrentStep(2);
  };

  const handleProviderSelect = (providerId: string) => {
    setSelectedProvider(providerId);
    setFormData(prev => ({ ...prev, provider: providerId, model: '' }));
    setSelectedModel('');
    setCurrentStep(isUnifiedView ? 3 : 2);
  };

  const handleModelSelect = (modelId: string, region?: string) => {
    setSelectedModel(modelId);
    if (region) {
      setSelectedRegion(region);
      setFormData(prev => ({ ...prev, model: modelId, region: region }));
    } else {
      setFormData(prev => ({ ...prev, model: modelId }));
    }
    setCurrentStep(isUnifiedView ? 4 : 3);
  };

  const handleAuthSubmit = (authData: Partial<AIConnectionForm>) => {
    setFormData(prev => ({ ...prev, ...authData }));
    setCurrentStep(isUnifiedView ? 5 : 4);
  };

  const handleReviewComplete = (reviewData: Partial<AIConnectionForm>) => {
    const provider = getCurrentProvider();
    let finalForm = { ...formData, ...reviewData, type: selectedType };

    let cleanForm: AIConnectionForm;
    if (provider?.id === 'aws') {
      // AWS: accessKeyId, secretAccessKey, region만 포함
      cleanForm = {
        name: finalForm.name,
        provider: finalForm.provider,
        model: finalForm.model,
        status: finalForm.status,
        type: finalForm.type,
        accessKeyId: finalForm.accessKeyId,
        secretAccessKey: finalForm.secretAccessKey,
        region: finalForm.region,
      } as AIConnectionForm;
    } else {
      // 일반: apiKey만 포함
      cleanForm = {
        name: finalForm.name,
        provider: finalForm.provider,
        model: finalForm.model,
        status: finalForm.status,
        type: finalForm.type,
        apiKey: finalForm.apiKey,
      } as AIConnectionForm;
    }

    // undefined/null/빈 문자열 key를 완전히 제거
    function removeEmptyFields(obj: any) {
      return Object.fromEntries(
        Object.entries(obj).filter(
          ([, v]) => v !== undefined && v !== null && v !== ''
        )
      );
    }

    const cleaned = removeEmptyFields(cleanForm);
    console.log('최종 저장 cleanForm:', cleaned);
    onSave(cleaned as unknown as AIConnectionForm);
  };

  const goToStep = (step: number) => {
    // For new connections, only allow going back. For editing, allow free navigation.
    if (editingConnection || step < currentStep) {
      setCurrentStep(step);
    }
  };

  const getCurrentProvider = () => {
    const providers = selectedType === 'language' ? LANGUAGE_MODEL_PROVIDERS : EMBEDDING_MODEL_PROVIDERS;
    return providers.find(p => p.id === selectedProvider);
  };

  const getCurrentModel = () => {
    const provider = getCurrentProvider();
    if (!provider) return undefined;
    // 콘솔로 실제 모델 id 목록 확인
    console.log('provider.models:', provider.models.map(m => m.id));
    // 대소문자 무시 매칭
    const found = provider.models.find(m => m.id.toLowerCase() === selectedModel.toLowerCase());
    if (!found) {
      console.log('Model not found:', selectedModel, provider.models.map(m => m.id));
    }
    return found;
  };

  const getProviderCards = () => {
    if (isUnifiedView && selectedType) {
      return selectedType === 'language' ? PROVIDER_CARDS : EMBEDDING_PROVIDER_CARDS;
    }
    return activeMenu === 'ai-language' ? PROVIDER_CARDS : EMBEDDING_PROVIDER_CARDS;
  };

  const wizardTitle = editingConnection 
    ? `Edit ${editingConnection.name}`
    : `New ${activeMenu === 'ai-model-config' ? 'AI Model' : (activeMenu === 'ai-language' ? 'Language Model' : 'Embedding Model')} Connection`;

  const renderCurrentStep = () => {
    if (isUnifiedView && currentStep === 1) {
      return <StepType onSelect={handleTypeSelect} />;
    }

    if (currentStep === (isUnifiedView ? 2 : 1)) {
      return (
        <StepProvider
          providers={getProviderCards()}
          onSelect={handleProviderSelect}
        />
      );
    }

    if (currentStep === (isUnifiedView ? 3 : 2)) {
      return (
        <StepModel
          provider={getCurrentProvider()}
          onSelect={handleModelSelect}
          onBack={() => goToStep(isUnifiedView ? 2 : 1)}
        />
      );
    }

    if (currentStep === (isUnifiedView ? 4 : 3)) {
      return (
        <StepAuth
          provider={getCurrentProvider()}
          model={getCurrentModel()}
          formData={formData}
          onSubmit={handleAuthSubmit}
          onBack={() => goToStep(isUnifiedView ? 3 : 2)}
        />
      );
    }

    if (currentStep === (isUnifiedView ? 5 : 4)) {
      return (
        <StepReview
          formData={formData}
          provider={getCurrentProvider()}
          model={getCurrentModel()}
          onComplete={handleReviewComplete}
          onBack={() => goToStep(isUnifiedView ? 4 : 3)}
        />
      );
    }

    return null;
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-4xl mx-auto py-8">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={onBack}
            className="flex items-center text-gray-600 dark:text-gray-300 hover:text-gray-800 dark:hover:text-gray-100 mb-4"
          >
            <ChevronLeft className="w-5 h-5 mr-1" />
            Back to AI Models
          </button>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">{wizardTitle}</h1>
        </div>

        {/* Progress Bar */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            {steps.map((step, index) => (
              <div key={step.id} className="flex items-center">
                <button
                  onClick={() => goToStep(step.id)}
                  className={`flex items-center justify-center w-10 h-10 rounded-full border-2 transition-all duration-200 ${
                    currentStep === step.id
                      ? 'bg-blue-500 border-blue-500 text-white'
                      : currentStep > step.id
                      ? 'bg-green-500 border-green-500 text-white'
                      : 'bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 text-gray-400 dark:text-gray-500 hover:border-gray-400 dark:hover:border-gray-400'
                  }`}
                >
                  {currentStep > step.id ? (
                    <Check className="w-5 h-5" />
                  ) : (
                    <span className="text-sm font-medium">{step.id}</span>
                  )}
                </button>
                {index < steps.length - 1 && (
                  <div
                    className={`w-16 h-0.5 mx-2 transition-all duration-200 ${
                      currentStep > step.id ? 'bg-green-500' : 'bg-gray-300 dark:bg-gray-600'
                    }`}
                  />
                )}
              </div>
            ))}
          </div>
          <div className="flex justify-between mt-2">
            {steps.map((step) => (
              <div
                key={step.id}
                className={`text-xs font-medium transition-colors duration-200 ${
                  currentStep === step.id
                    ? 'text-blue-600 dark:text-blue-400'
                    : currentStep > step.id
                    ? 'text-green-600 dark:text-green-400'
                    : 'text-gray-400 dark:text-gray-500'
                }`}
              >
                {step.title}
              </div>
            ))}
          </div>
        </div>

        {/* Step Content */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-8">
          {renderCurrentStep()}
        </div>
      </div>
    </div>
  );
};

export default AIConnectionWizard; 