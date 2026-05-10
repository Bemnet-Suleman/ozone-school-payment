import { useEffect } from "react";
import { Switch, Route, Router as WouterRouter, useLocation } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { setAuthTokenGetter } from "@workspace/api-client-react/custom-fetch";
import { useAuthStore } from "@/lib/auth";

import NotFound from "@/pages/not-found";
import Login from "@/pages/login";
import Register from "@/pages/register";
import ParentDashboard from "@/pages/parent/dashboard";
import ParentPay from "@/pages/parent/pay";
import ParentSuccess from "@/pages/parent/success";
import CashierDashboard from "@/pages/cashier/dashboard";
import AdminDashboard from "@/pages/admin/dashboard";

const queryClient = new QueryClient();

// Set auth token getter for API calls
setAuthTokenGetter(() => useAuthStore.getState().token);

function Router() {
  const token = useAuthStore((state) => state.token);
  const [, setLocation] = useLocation();

  useEffect(() => {
    if (!token && window.location.pathname !== "/register" && window.location.pathname !== "/") {
      setLocation("/");
    }
  }, [token, setLocation]);

  return (
    <Switch>
      <Route path="/" component={Login} />
      <Route path="/register" component={Register} />
      <Route path="/parent" component={ParentDashboard} />
      <Route path="/parent/pay/:studentId" component={ParentPay} />
      <Route path="/parent/success" component={ParentSuccess} />
      <Route path="/cashier" component={CashierDashboard} />
      <Route path="/admin" component={AdminDashboard} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
          <Router />
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
