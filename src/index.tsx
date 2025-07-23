import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { HashRouter } from "react-router-dom";
import 'react-quill/dist/quill.snow.css';
import './styles/rich-text.css';
import { App } from "./App";

// Use BrowserRouter for better URL structure
// Use HashRouter for better compatibility with direct URL access
// This helps with refreshing protected routes
createRoot(document.getElementById("app") as HTMLElement).render(
  <StrictMode>
    <HashRouter>
      <App />
    </HashRouter>
  </StrictMode>,
);