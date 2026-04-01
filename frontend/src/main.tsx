import React from "react";
import ReactDOM from "react-dom/client";
import { App } from "./App";
import { ErrorBoundary } from "./components/ErrorBoundary";
import "./styles.css";

const isDesignLab = new URLSearchParams(window.location.search).has("design_lab");

async function mount() {
  let Root: React.ComponentType;

  if (isDesignLab) {
    const { DesignLabPage } = await import("./__design_lab/DesignLabPage");
    Root = DesignLabPage;
  } else {
    Root = App;
  }

  ReactDOM.createRoot(document.getElementById("root")!).render(
    <React.StrictMode>
      <ErrorBoundary>
        <Root />
      </ErrorBoundary>
    </React.StrictMode>,
  );
}

void mount();
