import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App.jsx";
import "./tailwind-output.css";
import AuthGate from "./components/AuthGate.jsx";
import AppRouter from "./components/AppRouter.jsx"

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <AuthGate>
      <AppRouter />
    </AuthGate>
  </React.StrictMode>
);
