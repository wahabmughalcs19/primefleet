import { useState, type FormEvent } from "react";
import { QueryClient, QueryClientProvider, useQueryClient } from "@tanstack/react-query";
import { Redirect, Route, Switch, Router as WouterRouter, useLocation } from "wouter";
import { getGetCurrentAccessQueryKey, useGetCurrentAccess } from "@workspace/api-client-react";
import { AdminPage } from "./admin";

const queryClient = new QueryClient();

function LoginPage() {
  const client = useQueryClient();
  const [, setLocation] = useLocation();
  const access = useGetCurrentAccess({ query: { queryKey: getGetCurrentAccessQueryKey(), retry: false } });
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  if (access.data?.authenticated && access.data.isAdmin) return <Redirect to="/" />;

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setPending(true);
    setError("");
    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        credentials: "include",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          email: String(form.get("email") || ""),
          password: String(form.get("password") || ""),
        }),
      });
      if (!response.ok) {
        const body = await response.json().catch(() => null);
        setError(body?.error || "Sign-in failed.");
        return;
      }
      await client.invalidateQueries({ queryKey: getGetCurrentAccessQueryKey() });
      setLocation("/");
    } catch {
      setError("The server could not be reached.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="grid min-h-[100dvh] place-items-center bg-[#f0eadb] px-4 py-10">
      <form onSubmit={submit} className="w-full max-w-md rounded-2xl bg-[#fffdf8] p-8 shadow-sm" data-testid="form-admin-login">
        <p className="font-mono text-[10px] uppercase tracking-[.18em] text-[#9d6925]">Prime Fleet</p>
        <h1 className="mt-2 font-display text-3xl font-extrabold text-[#24333c]">Workshop sign in</h1>
        <p className="mt-2 text-sm text-[#68757c]">Use the administrator email and password from the server environment.</p>
        {error && <p className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-800" data-testid="status-login-error">{error}</p>}
        <label className="mt-5 grid gap-1.5 text-sm font-semibold">Email
          <input name="email" type="email" required autoComplete="username" data-testid="input-login-email" className="h-10 rounded-lg border border-[#d9d3c7] bg-[#f6f2e8] px-3 font-normal" />
        </label>
        <label className="mt-4 grid gap-1.5 text-sm font-semibold">Password
          <input name="password" type="password" required autoComplete="current-password" data-testid="input-login-password" className="h-10 rounded-lg border border-[#d9d3c7] bg-[#f6f2e8] px-3 font-normal" />
        </label>
        <button type="submit" disabled={pending} data-testid="button-login" className="mt-6 inline-flex h-11 w-full items-center justify-center rounded-lg bg-[#d69a3a] text-sm font-bold text-[#24333c] disabled:opacity-60">
          {pending ? "Signing in…" : "Sign in"}
        </button>
      </form>
    </div>
  );
}

const adminBase = import.meta.env.BASE_URL.replace(/\/$/, "");

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <WouterRouter base={adminBase}>
        <Switch>
          <Route path="/login" component={LoginPage} />
          <Route path="/"><AdminPage section="dashboard" /></Route>
          <Route path="/content"><AdminPage section="content" /></Route>
          <Route path="/services"><AdminPage section="services" /></Route>
          <Route path="/fleet"><AdminPage section="fleet" /></Route>
          <Route path="/maintenance"><AdminPage section="maintenance" /></Route>
          <Route path="/quotations"><AdminPage section="quotations" /></Route>
          <Route path="/inquiries"><AdminPage section="inquiries" /></Route>
          <Route path="/customers"><AdminPage section="customers" /></Route>
          <Route><Redirect to="/" /></Route>
        </Switch>
      </WouterRouter>
    </QueryClientProvider>
  );
}

export default App;
