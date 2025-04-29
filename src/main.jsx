import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App'; // Import your main App component
import './index.css'; // Import any global styles here

// Create the root element and render the App without the Router wrapper
const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <App />
);
