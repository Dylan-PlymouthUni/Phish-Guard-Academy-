// @ts-nocheck
import React from "react";
import ReactDOM from "react-dom/client";
import PhishGuardApp from "./App";
import "./App.css";

const root = document.getElementById("root");
if (!root) {
  throw new Error("Root element #root not found");
}

ReactDOM.createRoot(root).render(
  <React.StrictMode>
    <PhishGuardApp />
  </React.StrictMode>
);
