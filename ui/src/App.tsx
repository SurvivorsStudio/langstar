import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import FlowBuilder from './pages/FlowBuilder';
import AdminPage from './pages/AdminPage';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to="/admin" replace />} />
        <Route path="/admin" element={<AdminPage />} />
        <Route path="/flow/:id" element={<FlowBuilder />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;