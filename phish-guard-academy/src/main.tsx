/**
 * main component/module file.
 * This file is the entry point of the PhishGuard Academy application. It imports the main App component and renders it to the DOM. The App component is responsible for setting up routing, context providers, and global effects for the application.
 * It includes the following responsibilities:
 * - Importing the main App component.
 * - Rendering the App component inside a React.StrictMode wrapper for development.
 * - Mounting the application to the DOM element with id 'root'.
 */

import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
