import React, { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import FlowBuilder from './pages/FlowBuilder';
import WorkspacePage from './pages/WorkspacePage';
import DeploymentDetail from './components/deployment/DeploymentDetail';
import { useThemeStore } from './store/themeStore';

function App() {
  const { isDarkMode } = useThemeStore();

  useEffect(() => {
    // HTML 요소에 dark 클래스 추가/제거
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDarkMode]);

  return (
    <div className={isDarkMode ? 'dark' : ''}>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Navigate to="/workspace" replace />} />
          <Route path="/workspace" element={<WorkspacePage />} />
          <Route path="/flow/:id" element={<FlowBuilder />} />
          <Route path="/deployment/:deploymentId" element={<DeploymentDetail />} />
        </Routes>
      </BrowserRouter>
    </div>
  );
}

export default App;