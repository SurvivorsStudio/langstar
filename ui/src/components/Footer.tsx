import React from 'react';
import { useThemeStore } from '../store/themeStore';

const Footer: React.FC = () => {
  const { isDarkMode, toggleDarkMode } = useThemeStore();

  return (
    <footer className="bg-gray-100 dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700">
      <div className="px-4 py-3 flex justify-end items-center text-sm text-gray-600 dark:text-gray-400">
        <div className="flex items-center space-x-3">
          <button
            onClick={toggleDarkMode}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-white dark:focus:ring-offset-gray-800 ${
              isDarkMode ? 'bg-blue-600' : 'bg-gray-300 dark:bg-gray-600'
            }`}
            role="switch"
            aria-checked={isDarkMode}
            aria-label="다크모드 전환"
          >
            <span className="sr-only">다크모드 전환</span>
            <span
              className={`${
                isDarkMode ? 'translate-x-6' : 'translate-x-1'
              } inline-flex h-4 w-4 transform items-center justify-center rounded-full bg-white shadow-lg transition-transform duration-200 ease-in-out`}
            >
              {isDarkMode ? (
                <svg className="h-3 w-3 text-blue-600" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M9.528 1.718a.75.75 0 01.162.819A8.97 8.97 0 009 6a9 9 0 009 9 8.97 8.97 0 003.463-.69.75.75 0 01.981.98 10.503 10.503 0 01-9.694 6.46c-5.799 0-10.5-4.701-10.5-10.5 0-4.368 2.667-8.112 6.46-9.694a.75.75 0 01.818.162z"/>
                </svg>
              ) : (
                <svg className="h-3 w-3 text-yellow-500" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 2.25a.75.75 0 01.75.75v2.25a.75.75 0 01-1.5 0V3a.75.75 0 01.75-.75zM7.5 12a4.5 4.5 0 119 0 4.5 4.5 0 01-9 0zM18.894 6.166a.75.75 0 00-1.06-1.06l-1.591 1.59a.75.75 0 101.06 1.061l1.591-1.59zM21.75 12a.75.75 0 01-.75.75h-2.25a.75.75 0 010-1.5H21a.75.75 0 01.75.75zM17.834 18.894a.75.75 0 001.06-1.06l-1.59-1.591a.75.75 0 10-1.061 1.06l1.59 1.591zM12 18a.75.75 0 01.75.75V21a.75.75 0 01-1.5 0v-2.25A.75.75 0 0112 18zM7.758 17.303a.75.75 0 00-1.061-1.06l-1.591 1.59a.75.75 0 001.06 1.061l1.591-1.59zM6 12a.75.75 0 01-.75.75H3a.75.75 0 010-1.5h2.25A.75.75 0 016 12zM6.697 7.757a.75.75 0 001.06-1.06l-1.59-1.591a.75.75 0 00-1.061 1.06l1.59 1.591z"/>
                </svg>
              )}
            </span>
          </button>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
