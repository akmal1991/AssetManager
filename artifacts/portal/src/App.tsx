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
import {
  DEFAULT_LOCALE,
  getLocaleFromPath,
  getPreferredLocale,
  isLocale,
  setPreferredLocale,
  withLocale,
  type Locale,
} from "./lib/i18n";

const originalFetch = window.fetch;
window.fetch = async (input, init) => {
  const url = input.toString();
  if (url.includes("/api/")) {
    const token = localStorage.getItem("portal_token");
    if (token) {
      init = init || {};
      const headers = new Headers(init.headers);
      headers.set("Authorization", `Bearer ${token}`);
      init.headers = headers;
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

function LoadingScreen() {
  return <div className="h-screen w-screen flex items-center justify-center bg-background"><LoadingSpinner /></div>;
}

function ProtectedRoute({
  component: Component,
  allowedRoles,
}: {
  component: any;
  allowedRoles?: string[];
}) {
  const { user, isLoading, isAuthenticated } = useAuth();
  const [location, setLocation] = useLocation();
  const locale = getLocaleFromPath(location);

  useEffect(() => {
    if (isLoading) return;

    if (!isAuthenticated) {
      setLocation(withLocale("/login", locale));
      return;
    }

    if (allowedRoles && user && !allowedRoles.includes(user.role)) {
      setLocation(withLocale(`/dashboard/${user.role}`, locale));
    }
  }, [allowedRoles, isAuthenticated, isLoading, locale, setLocation, user]);

  if (isLoading) {
    return <LoadingScreen />;
  }

  if (!isAuthenticated || (allowedRoles && user && !allowedRoles.includes(user.role))) {
    return null;
  }

  return <Component />;
}

function LocaleRedirect({ locale }: { locale: Locale }) {
  const [, setLocation] = useLocation();

  useEffect(() => {
    setPreferredLocale(locale);
    setLocation(`/${locale}`);
  }, [locale, setLocation]);

  return <LoadingScreen />;
}

function PathRedirect({ to }: { to: string }) {
  const [location, setLocation] = useLocation();
  const locale = getLocaleFromPath(location);

  useEffect(() => {
    setLocation(withLocale(to, locale));
  }, [locale, setLocation, to]);

  return <LoadingScreen />;
}

function DefaultRedirect() {
  const { user, isLoading, isAuthenticated } = useAuth();
  const [location, setLocation] = useLocation();
  const locale = getLocaleFromPath(location);

  useEffect(() => {
    setPreferredLocale(locale);
    if (isLoading) return;

    if (isAuthenticated && user) {
      setLocation(withLocale(`/dashboard/${user.role}`, locale));
      return;
    }

    setLocation(withLocale("/login", locale));
  }, [isAuthenticated, isLoading, locale, setLocation, user]);

  return <LoadingScreen />;
}

function Router() {
  const preferredLocale = getPreferredLocale();

  return (
    <Switch>
      <Route path="/">
        <LocaleRedirect locale={preferredLocale} />
      </Route>

      <Route path="/login">
        <PathRedirect to="/login" />
      </Route>

      <Route path="/dashboard/:role">
        <PathRedirect to="/dashboard/author" />
      </Route>

      <Route path="/submissions/new">
        <PathRedirect to="/submissions/new" />
      </Route>

      <Route path="/reviews/:id">
        <PathRedirect to="/reviews/1" />
      </Route>

      <Route path="/:locale">
        {(params) => (isLocale(params.locale) ? <DefaultRedirect /> : <NotFound />)}
      </Route>

      <Route path="/:locale/login">
        {(params) => (isLocale(params.locale) ? <Login /> : <NotFound />)}
      </Route>

      <Route path="/:locale/dashboard/author">
        {(params) =>
          isLocale(params.locale) ? <ProtectedRoute component={AuthorDashboard} allowedRoles={["author"]} /> : <NotFound />
        }
      </Route>
      <Route path="/:locale/dashboard/author/:tab">
        {(params) =>
          isLocale(params.locale) ? <ProtectedRoute component={AuthorDashboard} allowedRoles={["author"]} /> : <NotFound />
        }
      </Route>
      <Route path="/:locale/submissions/new">
        {(params) =>
          isLocale(params.locale) ? <ProtectedRoute component={NewSubmissionWizard} allowedRoles={["author"]} /> : <NotFound />
        }
      </Route>

      <Route path="/:locale/dashboard/editor">
        {(params) =>
          isLocale(params.locale) ? <ProtectedRoute component={EditorDashboard} allowedRoles={["editor", "admin"]} /> : <NotFound />
        }
      </Route>
      <Route path="/:locale/dashboard/editor/:tab">
        {(params) =>
          isLocale(params.locale) ? <ProtectedRoute component={EditorDashboard} allowedRoles={["editor", "admin"]} /> : <NotFound />
        }
      </Route>

      <Route path="/:locale/dashboard/reviewer">
        {(params) =>
          isLocale(params.locale) ? <ProtectedRoute component={ReviewerDashboard} allowedRoles={["reviewer"]} /> : <NotFound />
        }
      </Route>
      <Route path="/:locale/dashboard/reviewer/:tab">
        {(params) =>
          isLocale(params.locale) ? <ProtectedRoute component={ReviewerDashboard} allowedRoles={["reviewer"]} /> : <NotFound />
        }
      </Route>
      <Route path="/:locale/reviews/:id">
        {(params) =>
          isLocale(params.locale) ? <ProtectedRoute component={ReviewForm} allowedRoles={["reviewer", "editor", "admin"]} /> : <NotFound />
        }
      </Route>

      <Route path="/:locale/dashboard/admin">
        {(params) => (isLocale(params.locale) ? <ProtectedRoute component={AdminDashboard} allowedRoles={["admin"]} /> : <NotFound />)}
      </Route>
      <Route path="/:locale/dashboard/admin/:section">
        {(params) => (isLocale(params.locale) ? <ProtectedRoute component={AdminDashboard} allowedRoles={["admin"]} /> : <NotFound />)}
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
