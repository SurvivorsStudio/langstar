import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import FlowBuilder from './pages/FlowBuilder';
import WorkspacePage from './pages/WorkspacePage';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to="/workspace" replace />} />
        <Route path="/workspace" element={<WorkspacePage />} />
        <Route path="/flow/:id" element={<FlowBuilder />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;