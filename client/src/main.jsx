import React from "react";
import { useCallback, useEffect, useLayoutEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import App from "./pages/App.jsx";
import Dashboard from "./pages/Dashboard.jsx";
import Login from "./pages/Login.jsx";
import "./styles.css";

function navigateTo(path, replace = false) {
  if (replace) {
    window.history.replaceState({}, "", path);
  } else {
    window.history.pushState({}, "", path);
  }
  window.dispatchEvent(new PopStateEvent("popstate"));
}

function ProtectedRoute({ children, onNavigate }) {
  const token = localStorage.getItem("aurora_token");

  useEffect(() => {
    // A protecao do painel tambem existe na API; aqui evitamos abrir a tela sem token.
    if (!token) {
      onNavigate("/login", true);
    }
  }, [token, onNavigate]);

  return token ? children : null;
}

function Router() {
  const [path, setPath] = useState(window.location.pathname);

  useLayoutEffect(() => {
    function syncPath() {
      setPath(window.location.pathname);
    }

    window.addEventListener("popstate", syncPath);
    return () => window.removeEventListener("popstate", syncPath);
  }, []);

  const navigate = useCallback((nextPath, replace = false) => navigateTo(nextPath, replace), []);

  if (path === "/login") {
    return <Login onNavigate={navigate} />;
  }

  if (path === "/admin") {
    return (
      <ProtectedRoute onNavigate={navigate}>
        <Dashboard onNavigate={navigate} />
      </ProtectedRoute>
    );
  }

  if (path !== "/") {
    return <Redirect onNavigate={navigate} />;
  }

  return <App onNavigate={navigate} />;
}

function Redirect({ onNavigate }) {
  useEffect(() => { onNavigate("/", true); }, [onNavigate]);
  return null;
}

createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <Router />
  </React.StrictMode>
);
