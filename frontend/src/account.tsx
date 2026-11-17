import { useEffect, useState, type FormEvent } from "react";
import { Redirect } from "wouter";

type Overview = {
  name: string;
  email: string;
  phone: string;
  companyName: string;
  requests: Array<{
    id: number;
    registrationNumber: string;
    model: string;
    issueDescription: string;
    status: string;
    createdAt: string;
    quotationStatus: string | null;
    quotationNotes: string;
  }>;
  inquiries: Array<{ id: number; subject: string; message: string; status: string; createdAt: string }>;
};

const dateLabel = (value?: string) => value ? new Date(value).toLocaleDateString("en-PK", { day: "numeric", month: "short", year: "numeric" }) : "—";
const pill = (status: string) => ["Completed", "Approved", "Replied"].includes(status) ? "bg-[#e6f0e8] text-[#386b54]" : ["Cancelled", "Rejected", "Closed"].includes(status) ? "bg-[#f5e7e3] text-[#9c4d42]" : ["In Progress", "Sent", "Read"].includes(status) ? "bg-[#e8edf0] text-[#486774]" : "bg-[#f8efd9] text-[#95621e]";

export function CustomerLogin() {
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);
  const [pending, setPending] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    setPending(true);
    setError("");
    try {
      const response = await fetch("/api/auth/customer/login", {
        method: "POST",
        credentials: "include",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email: data.get("email"), password: data.get("password") }),
      });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) {
        setError(body.error || "Sign-in failed.");
        return;
      }
      setDone(true);
    } catch {
      setError("The workshop desk could not be reached.");
    } finally {
      setPending(false);
    }
  }

  if (done) return <Redirect to="/account" />;

  return <div className="grid min-h-[70vh] place-items-center px-4 py-16">
    <form onSubmit={submit} className="w-full max-w-md rounded-2xl border border-[#e4dccb] bg-white p-8 shadow-sm" data-testid="form-customer-login">
      <p className="font-mono text-[10px] uppercase tracking-[.18em] text-[#9d6925]">Your jobs</p>
      <h1 className="mt-2 font-display text-3xl font-extrabold text-[#20313c]">Check your vehicle</h1>
      <p className="mt-2 text-sm leading-6 text-[#68757c]">Use the email and password the workshop gave you. You will only see your own requests.</p>
      {error && <p className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-800">{error}</p>}
      <label className="mt-5 grid gap-1.5 text-sm font-semibold">Email<input name="email" type="email" required className="h-11 rounded-lg border border-[#d9d3c7] bg-[#fbf8ef] px-3 font-normal" /></label>
      <label className="mt-4 grid gap-1.5 text-sm font-semibold">Password<input name="password" type="password" required className="h-11 rounded-lg border border-[#d9d3c7] bg-[#fbf8ef] px-3 font-normal" /></label>
      <button disabled={pending} className="mt-6 h-11 w-full rounded-lg bg-[#20313c] text-sm font-bold text-[#f6f1e6]">{pending ? "Signing in…" : "See my jobs"}</button>
    </form>
  </div>;
}

export function CustomerAccount() {
  const [data, setData] = useState<Overview | null>(null);
  const [missing, setMissing] = useState(false);
  const [error, setError] = useState(false);

  useEffect(() => {
    fetch("/api/customer/overview", { credentials: "include" })
      .then(async (response) => {
        if (response.status === 401) { setMissing(true); return; }
        if (!response.ok) { setError(true); return; }
        setData(await response.json());
      })
      .catch(() => setError(true));
  }, []);

  if (missing) return <Redirect to="/login" />;
  if (error) return <p className="px-5 py-20 text-center text-sm">Your jobs could not be loaded. Refresh and try again.</p>;
  if (!data) return <div className="px-5 py-20"><div className="mx-auto h-24 max-w-3xl animate-pulse rounded-xl bg-[#eeeae0]" /></div>;

  return <main className="mx-auto max-w-5xl px-5 py-12">
    <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
      <div>
        <p className="font-mono text-[10px] uppercase tracking-[.18em] text-[#9d6925]">Hello, {data.name}</p>
        <h1 className="mt-2 font-display text-4xl font-extrabold text-[#20313c]">Your workshop updates</h1>
        <p className="mt-2 text-sm text-[#68757c]">{data.companyName || data.email}{data.phone ? ` · ${data.phone}` : ""}</p>
      </div>
      <button className="h-10 rounded-lg border border-[#d9d3c7] px-4 text-sm font-bold" onClick={async () => { await fetch("/api/auth/customer/logout", { method: "POST", credentials: "include" }); window.location.href = "/"; }}>Sign out</button>
    </div>

    <section className="mt-8">
      <h2 className="font-display text-2xl font-extrabold">Maintenance</h2>
      <p className="mt-1 text-sm text-[#68757c]">Work booked for your vehicles, and where each job stands.</p>
      <div className="mt-4 grid gap-3">
        {data.requests.length === 0 ? <p className="rounded-xl border border-dashed border-[#d9d3c7] p-6 text-sm text-[#68757c]">No maintenance jobs yet. When the workshop logs one for your company, it will show here.</p> : data.requests.map((job) => <article key={job.id} className="rounded-xl border border-[#e4dccb] bg-white p-5">
          <div className="flex flex-wrap items-center gap-2"><b className="font-mono">{job.registrationNumber}</b>{job.model && <span className="text-sm text-[#68757c]">{job.model}</span>}<span className={`rounded-full px-2.5 py-1 text-[10px] font-bold ${pill(job.status)}`}>{job.status}</span></div>
          <p className="mt-3 text-sm leading-6">{job.issueDescription}</p>
          <p className="mt-3 text-xs text-[#68757c]">Opened {dateLabel(job.createdAt)}{job.quotationStatus ? ` · Estimate: ${job.quotationStatus}` : ""}</p>
          {job.quotationNotes && <p className="mt-2 text-sm text-[#526167]">{job.quotationNotes}</p>}
        </article>)}
      </div>
    </section>

    <section className="mt-10">
      <h2 className="font-display text-2xl font-extrabold">Messages</h2>
      <p className="mt-1 text-sm text-[#68757c]">Inquiries sent from {data.email}.</p>
      <div className="mt-4 grid gap-3">
        {data.inquiries.length === 0 ? <p className="rounded-xl border border-dashed border-[#d9d3c7] p-6 text-sm text-[#68757c]">No messages from this email yet.</p> : data.inquiries.map((note) => <article key={note.id} className="rounded-xl border border-[#e4dccb] bg-white p-5">
          <div className="flex flex-wrap items-center gap-2"><b>{note.subject || "Message"}</b><span className={`rounded-full px-2.5 py-1 text-[10px] font-bold ${pill(note.status)}`}>{note.status}</span></div>
          <p className="mt-3 text-sm leading-6">{note.message}</p>
          <p className="mt-3 text-xs text-[#68757c]">{dateLabel(note.createdAt)}</p>
        </article>)}
      </div>
    </section>
  </main>;
}
