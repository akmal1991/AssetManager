import React, { useEffect } from "react";
import { Switch, Route, Router as WouterRouter, useLocation } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";

import Login from "./pages/login";
import AuthorDashboard from "./pages/dashboard/author";
import EditorDashboard from "./pages/dashboard/editor";
import ReviewerDashboard from "./pages/dashboard/reviewer";
import AdminDashboard from "./pages/dashboard/admin";
import NewSubmissionWizard from "./pages/submissions/new";
import ReviewForm from "./pages/reviews/[id]";

import { useAuth } from "./hooks/use-auth";
import { LoadingSpinner } from "./components/ui/shared";

const originalFetch = window.fetch;
window.fetch = async (input, init) => {
  let url = input.toString();
  if (url.includes('/api/')) {
    const token = localStorage.getItem('portal_token');
    if (token) {
      init = init || {};
      init.headers = {
        ...init.headers,
        Authorization: `Bearer ${token}`,
      };
    }
  }
  return originalFetch(input, init);
};

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

function ProtectedRoute({ component: Component, allowedRoles }: { component: any, allowedRoles?: string[] }) {
  const { user, isLoading, isAuthenticated } = useAuth();
  const [, setLocation] = useLocation();

  useEffect(() => {
    if (!isLoading) {
      if (!isAuthenticated) {
        setLocation("/login");
      } else if (allowedRoles && user && !allowedRoles.includes(user.role)) {
        setLocation(`/dashboard/${user.role}`);
      }
    }
  }, [isLoading, isAuthenticated, user, allowedRoles, setLocation]);

  if (isLoading) {
    return <div className="h-screen w-screen flex items-center justify-center bg-background"><LoadingSpinner /></div>;
  }

  if (!isAuthenticated || (allowedRoles && user && !allowedRoles.includes(user.role))) {
    return null;
  }

  return <Component />;
}

function DefaultRedirect() {
  const { user, isLoading, isAuthenticated } = useAuth();
  const [, setLocation] = useLocation();

  useEffect(() => {
    if (!isLoading) {
      if (isAuthenticated && user) {
        setLocation(`/dashboard/${user.role}`);
      } else {
        setLocation("/login");
      }
    }
  }, [isLoading, isAuthenticated, user, setLocation]);

  return <div className="h-screen w-screen flex items-center justify-center bg-background"><LoadingSpinner /></div>;
}

function Router() {
  return (
    <Switch>
      <Route path="/" component={DefaultRedirect} />
      <Route path="/login" component={Login} />

      {/* Author Routes */}
      <Route path="/dashboard/author">
        {() => <ProtectedRoute component={AuthorDashboard} allowedRoles={['author']} />}
      </Route>
      <Route path="/dashboard/author/:tab">
        {() => <ProtectedRoute component={AuthorDashboard} allowedRoles={['author']} />}
      </Route>
      <Route path="/submissions/new">
        {() => <ProtectedRoute component={NewSubmissionWizard} allowedRoles={['author']} />}
      </Route>

      {/* Editor Routes */}
      <Route path="/dashboard/editor">
        {() => <ProtectedRoute component={EditorDashboard} allowedRoles={['editor', 'admin']} />}
      </Route>
      <Route path="/dashboard/editor/:tab">
        {() => <ProtectedRoute component={EditorDashboard} allowedRoles={['editor', 'admin']} />}
      </Route>

      {/* Reviewer Routes */}
      <Route path="/dashboard/reviewer">
        {() => <ProtectedRoute component={ReviewerDashboard} allowedRoles={['reviewer']} />}
      </Route>
      <Route path="/dashboard/reviewer/:tab">
        {() => <ProtectedRoute component={ReviewerDashboard} allowedRoles={['reviewer']} />}
      </Route>
      <Route path="/reviews/:id">
        {() => <ProtectedRoute component={ReviewForm} allowedRoles={['reviewer', 'editor', 'admin']} />}
      </Route>

      {/* Admin Routes — each sub-path maps to AdminDashboard, which reads the URL */}
      <Route path="/dashboard/admin">
        {() => <ProtectedRoute component={AdminDashboard} allowedRoles={['admin']} />}
      </Route>
      <Route path="/dashboard/admin/:section">
        {() => <ProtectedRoute component={AdminDashboard} allowedRoles={['admin']} />}
      </Route>

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
