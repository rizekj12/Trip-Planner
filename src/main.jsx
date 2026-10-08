import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import App from "./App.jsx";
// Tailwind is compiled by Vite via PostCSS (postcss.config.cjs), so new classes show up on save
import "./index.css";
import { AuthProvider } from "./context/AuthContext.jsx";
import AuthGate from "./components/AuthGate.jsx";

const queryClient = new QueryClient({
  defaultOptions: { queries: { staleTime: 60_000, retry: 1 } },
});

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <AuthGate>
          <BrowserRouter>
            <App />
          </BrowserRouter>
        </AuthGate>
      </AuthProvider>
    </QueryClientProvider>
  </React.StrictMode>
);
