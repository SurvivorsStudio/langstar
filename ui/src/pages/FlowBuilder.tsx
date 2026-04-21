import React, { useState } from 'react';
import { ReactFlowProvider } from 'reactflow';
import FlowBuilderComponent from '../components/FlowBuilder';
import Header from '../components/Header';
import Footer from '../components/Footer';
import 'reactflow/dist/style.css';

function FlowBuilder() {
  const [aiPanelOpen, setAiPanelOpen] = useState(false);

  return (
    <div className="flex flex-col h-screen w-full bg-gray-50 dark:bg-gray-900">
      <Header
        aiPanelOpen={aiPanelOpen}
        onToggleAiPanel={() => setAiPanelOpen((v) => !v)}
      />
      <div className="flex-1 overflow-hidden">
        <ReactFlowProvider>
          <FlowBuilderComponent aiPanelOpen={aiPanelOpen} />
        </ReactFlowProvider>
      </div>
      <Footer />
    </div>
  );
}

export default FlowBuilder;