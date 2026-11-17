import { useEffect, useState, type FormEvent } from "react";

type Customer = { id: number; name: string; email: string; phone: string; companyId: number | null; companyName: string | null };
type Company = { id: number; name: string };

async function api(path: string, options?: RequestInit) {
  const response = await fetch(path, { credentials: "include", headers: { "content-type": "application/json" }, ...options });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(body.error || "Request failed.");
  return body;
}

export function Customers() {
  const [rows, setRows] = useState<Customer[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [password, setPassword] = useState("");

  async function load() {
    const customers = await api("/api/admin/customers");
    setRows(customers);
    try {
      const companyPage = await api("/api/admin/companies?limit=100");
      setCompanies(Array.isArray(companyPage) ? companyPage : []);
    } catch {
      setCompanies([]);
    }
  }

  useEffect(() => { load().catch((err) => setError(err.message)); }, []);

  async function create(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    setError("");
    try {
      const createdPassword = String(data.get("password") || "");
      await api("/api/admin/customers", {
        method: "POST",
        body: JSON.stringify({
          name: data.get("name"),
          email: data.get("email"),
          phone: data.get("phone"),
          password: createdPassword,
          companyId: data.get("companyId"),
        }),
      });
      setPassword(createdPassword);
      setNotice(`Login created for ${String(data.get("email"))}. Give them this password: ${createdPassword}`);
      form.reset();
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not create the login.");
    }
  }

  async function remove(id: number) {
    if (!window.confirm("Remove this customer login?")) return;
    await api(`/api/admin/customers/${id}`, { method: "DELETE" });
    await load();
  }

  async function resetPassword(row: Customer) {
    const next = window.prompt(`New password for ${row.email}`, "");
    if (!next) return;
    try {
      await api(`/api/admin/customers/${row.id}`, { method: "PATCH", body: JSON.stringify({ password: next }) });
      setPassword(next);
      setNotice(`New password for ${row.email}: ${next}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not change the password.");
    }
  }

  return <div className="grid gap-6 xl:grid-cols-[360px_1fr]">
    <form onSubmit={create} className="grid gap-3 rounded-xl border border-[#dcd7ca] bg-[#fffdf8] p-5" data-testid="form-customer">
      <h2 className="font-display text-xl font-extrabold">New customer login</h2>
      <p className="text-sm text-[#68757c]">They sign in on the public site and see only this company's jobs and messages sent from their email.</p>
      {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-800">{error}</p>}
      {notice && <p className="rounded-lg bg-[#e8f1eb] px-3 py-2 text-sm font-semibold text-[#356f61]" data-testid="status-customer-created">{notice}</p>}
      <label className="grid gap-1 text-sm font-semibold">Name<input name="name" required className="h-10 rounded-lg border border-[#d9d3c7] px-3 font-normal" /></label>
      <label className="grid gap-1 text-sm font-semibold">Email<input name="email" type="email" required className="h-10 rounded-lg border border-[#d9d3c7] px-3 font-normal" /></label>
      <label className="grid gap-1 text-sm font-semibold">Phone<input name="phone" className="h-10 rounded-lg border border-[#d9d3c7] px-3 font-normal" /></label>
      <label className="grid gap-1 text-sm font-semibold">Password<input name="password" required minLength={6} value={password} onChange={(event) => setPassword(event.target.value)} className="h-10 rounded-lg border border-[#d9d3c7] px-3 font-normal" /></label>
      <label className="grid gap-1 text-sm font-semibold">Company
        <select name="companyId" className="h-10 rounded-lg border border-[#d9d3c7] px-3 font-normal">
          <option value="">No company yet</option>
          {companies.map((company) => <option key={company.id} value={company.id}>{company.name}</option>)}
        </select>
      </label>
      <button className="mt-1 h-10 rounded-lg bg-[#d69a3a] text-sm font-bold" type="submit">Create login</button>
    </form>
    <section className="rounded-xl border border-[#dcd7ca] bg-[#fffdf8]">
      <div className="border-b border-[#e5e0d4] px-5 py-4"><h2 className="font-display text-lg font-extrabold">Customer logins</h2><p className="text-xs text-[#68757c]">{rows.length} accounts</p></div>
      {rows.length === 0 ? <p className="p-8 text-sm text-[#68757c]">No customer logins yet.</p> : rows.map((row) => <div key={row.id} className="flex flex-col gap-2 border-b border-[#e5e0d4] px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
        <div><b>{row.name}</b><p className="text-sm text-[#68757c]">{row.email}{row.phone ? ` · ${row.phone}` : ""}</p><p className="text-xs text-[#8a6b3b]">{row.companyName || "Not linked to a company"}</p></div>
        <div className="flex gap-2"><button className="rounded-lg border border-[#d9d3c7] px-3 py-2 text-xs font-bold" onClick={() => resetPassword(row)}>New password</button><button className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs font-bold text-red-800" onClick={() => remove(row.id)}>Remove</button></div>
      </div>)}
    </section>
  </div>;
}
