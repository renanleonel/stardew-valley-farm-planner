import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Planner } from "@/containers/planner";
import "@/styles.css";

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: 1 } },
});
const root = document.getElementById("root");
if (!root) throw new Error("The app root element is missing");

createRoot(root).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <Planner />
    </QueryClientProvider>
  </StrictMode>,
);
