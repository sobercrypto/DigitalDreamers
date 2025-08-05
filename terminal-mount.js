import React from 'react';
import { createRoot } from 'react-dom/client';
import DOSTerminal from './components/DOSTerminal';

// Mount the terminal when the center monitor is clicked
document.querySelector('.center-computer').addEventListener('click', () => {
  const container = document.getElementById('dos-terminal');
  if (!container._reactRoot) {
    const root = createRoot(container);
    root.render(<DOSTerminal />);
    container._reactRoot = root;
  }
});