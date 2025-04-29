import React from "react";
import ReactDOM from "react-dom/client";
import { Theme } from "@radix-ui/themes";

import App from "@/client/App";
import "@/client/index.css";

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <Theme>
      <App />
    </Theme>
  </React.StrictMode>
);
