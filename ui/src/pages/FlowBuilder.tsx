import React from 'react';
import { ReactFlowProvider } from 'reactflow';
import FlowBuilderComponent from '../components/FlowBuilder';
import Header from '../components/Header';
import ChatBot from '../components/ChatBot';
import 'reactflow/dist/style.css';

function FlowBuilder() {
  return (
    <div className="flex flex-col h-screen w-full bg-gray-50">
      <Header />
      <div className="flex-1 overflow-hidden">
        <ReactFlowProvider>
          <FlowBuilderComponent />
        </ReactFlowProvider>
      </div>
      <ChatBot />
    </div>
  );
}

export default FlowBuilder;