import { useEffect, useState, type FormEvent, type ReactNode } from 'react';
import type { InputHTMLAttributes, TextareaHTMLAttributes, SelectHTMLAttributes } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Redirect, Link, useLocation } from 'wouter';
import { ArrowRight, ArrowUpRight, Building2, Check, ClipboardList, FileText, Gauge, Layers3, LogOut, Menu, MessageSquareText, Plus, Search, ShieldCheck, Truck, Users, Wrench, X } from 'lucide-react';
import { FleetManager, Inquiries, Maintenance, Quotes } from './admin-records';
import { Customers } from './customers';
import {
  getGetCurrentAccessQueryKey, getGetDashboardSummaryQueryKey, getGetPublicContentQueryKey,
  getGetCompanyQueryKey, getListAdminBrandsQueryKey, getListAdminServicesQueryKey,
  getListAdminVehicleCategoriesQueryKey, getListCompaniesQueryKey, getListContactInquiriesQueryKey,
  getListMaintenanceRequestsQueryKey, getListPublicServicesQueryKey, getListQuotationsQueryKey,
  getListVehiclesQueryKey, getSearchVehiclesQueryKey,
  useCreateBrand, useCreateCompany, useCreateMaintenanceRequest, useCreateQuotation,
  useCreateService, useCreateVehicle, useCreateVehicleCategory, useDeleteBrand,
  useDeleteCompany, useDeleteService, useDeleteVehicle, useDeleteVehicleCategory,
  useGetCompany, useGetCurrentAccess, useGetDashboardSummary, useGetPublicContent,
  useListAdminBrands, useListAdminServices, useListAdminVehicleCategories, useListCompanies,
  useListContactInquiries, useListMaintenanceRequests, useListQuotations, useListVehicles,
  useSearchVehicles, useUpdateBrand, useUpdateCompany, useUpdateContactInquiry,
  useUpdateMaintenanceRequest, useUpdateQuotation, useUpdateService, useUpdateSiteContent,
  useUpdateVehicle, useUpdateVehicleCategory,
} from '@workspace/api-client-react';

const cn = (...s: (string | false | undefined)[]) => s.filter(Boolean).join(' ');
const publicSite = import.meta.env.VITE_PUBLIC_URL || (import.meta.env.PROD ? '/' : 'http://localhost:5173');
const nav = [
  ['Overview', '/', Gauge], ['Website content', '/content', Layers3],
  ['Services', '/services', Wrench], ['Fleet & companies', '/fleet', Building2],
  ['Maintenance', '/maintenance', ClipboardList], ['Quotations', '/quotations', FileText],
  ['Inquiries', '/inquiries', MessageSquareText], ['Customer logins', '/customers', Users],
] as const;
const statusColor = (s: string) => ['Completed', 'Approved', 'Replied', 'Published'].includes(s) ? 'bg-[#e6f0e8] text-[#386b54]' : ['Cancelled', 'Rejected', 'Closed', 'Draft'].includes(s) ? 'bg-[#f5e7e3] text-[#9c4d42]' : ['In Progress', 'Sent', 'Read'].includes(s) ? 'bg-[#e8edf0] text-[#486774]' : 'bg-[#f8efd9] text-[#95621e]';
function Status({ value }: { value: string }) { return <span className={cn('inline-flex rounded-full px-2.5 py-1 text-[10px] font-bold', statusColor(value))} data-testid={`status-${value.toLowerCase().replaceAll(' ', '-')}`}>{value}</span>; }
function P({ children, className = '' }: { children: ReactNode; className?: string }) { return <section className={cn('rounded-xl border border-[#dcd7ca] bg-[#fffdf8] shadow-[0_2px_12px_rgba(40,44,39,.035)]', className)}>{children}</section>; }
function Eyebrow({ children }: { children: ReactNode }) { return <div className="mb-3 font-mono text-[10px] uppercase tracking-[.18em] text-[#9d6925]">{children}</div>; }
function Btn({ children, testId, type = 'button', kind = 'primary', disabled, onClick }: { children: ReactNode; testId: string; type?: 'button' | 'submit'; kind?: 'primary' | 'outline' | 'quiet' | 'danger'; disabled?: boolean; onClick?: () => void }) {
  return <button type={type} onClick={onClick} disabled={disabled} data-testid={testId} className={cn('inline-flex min-h-10 items-center justify-center gap-2 rounded-lg px-4 text-sm font-semibold transition hover:-translate-y-px disabled:opacity-50', kind === 'primary' && 'bg-[#d69a3a] text-[#24333c]', kind === 'outline' && 'border border-[#d9d3c7] bg-[#fffdf8]', kind === 'quiet' && 'text-[#68757c] hover:bg-[#f0ede5]', kind === 'danger' && 'border border-red-200 bg-red-50 text-red-800')}>{children}</button>;
}
function F({ label, children }: { label: string; children: ReactNode }) { return <label className="grid gap-1.5 text-sm font-semibold"><span>{label}</span>{children}</label>; }
function I(props: InputHTMLAttributes<HTMLInputElement>) { return <input {...props} className={cn('h-10 w-full rounded-lg border border-[#d9d3c7] bg-[#fffdf8] px-3 text-sm font-normal outline-none focus:border-[#d69a3a] focus:ring-2 focus:ring-[#d69a3a]/20', props.className)} />; }
function T(props: TextareaHTMLAttributes<HTMLTextAreaElement>) { return <textarea {...props} className={cn('min-h-24 w-full rounded-lg border border-[#d9d3c7] bg-[#fffdf8] px-3 py-2.5 text-sm font-normal outline-none focus:border-[#d69a3a] focus:ring-2 focus:ring-[#d69a3a]/20', props.className)} />; }
function S(props: SelectHTMLAttributes<HTMLSelectElement>) { return <select {...props} className={cn('h-10 w-full rounded-lg border border-[#d9d3c7] bg-[#fffdf8] px-3 text-sm font-normal outline-none focus:border-[#d69a3a]', props.className)} />; }
function Load({ loading, error, empty, retry, children }: { loading?: boolean; error?: boolean; empty?: boolean; retry?: () => void; children: ReactNode }) {
  if (loading) return <div className="space-y-3 p-5" data-testid="state-loading">{[0, 1, 2].map(x => <div className="h-12 animate-pulse rounded-lg bg-[#eeeae0]" key={x} />)}</div>;
  if (error) return <div className="p-8 text-center text-sm text-[#68757c]" data-testid="state-error">Could not load these records. <button className="ml-1 font-bold text-[#95621e]" onClick={retry} data-testid="button-retry-query">Try again</button></div>;
  if (empty) return <div className="p-9 text-center text-sm text-[#68757c]" data-testid="state-empty">No records to show yet.</div>;
  return <>{children}</>;
}
function Shell({ children, page, description }: { children: ReactNode; page: string; description: string }) {
  const [loc] = useLocation(); const [, setLocation] = useLocation(); const [mobile, setMobile] = useState(false);
  const client = useQueryClient();
  const access = useGetCurrentAccess({ query: { queryKey: getGetCurrentAccessQueryKey(), retry: false } });
  async function signOut() {
    await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' });
    client.clear();
    setLocation('/login');
  }
  return <div className="min-h-[100dvh] bg-[#f2efe7] text-[#24333c] md:flex">
    <aside className={cn('fixed inset-y-0 left-0 z-50 flex w-[258px] flex-col bg-[#20313c] text-[#f1ede1] transition-transform md:static md:translate-x-0', mobile ? 'translate-x-0' : '-translate-x-full')} data-testid="admin-sidebar">
      <Link href="/" className="flex items-center gap-3 border-b border-[#40505a] px-5 py-5" data-testid="link-admin-brand"><span className="grid h-10 w-10 place-items-center rounded-xl bg-[#d69a3a] text-[#20313c]"><Truck className="h-5 w-5" /></span><span><b className="font-display text-sm">Prime Fleet</b><small className="mt-0.5 block font-mono text-[9px] uppercase tracking-[.18em] text-[#b7c1bd]">Operations desk</small></span></Link>
      <div className="px-5 pb-2 pt-6 font-mono text-[9px] uppercase tracking-[.2em] text-[#92a09e]">Workspace</div><nav className="flex-1 space-y-1 px-3" data-testid="nav-admin">
        {nav.map(([label, href, Icon]) => <Link key={href} href={href} onClick={() => setMobile(false)} data-testid={`link-admin-${href === '/' ? 'overview' : href.split('/').at(-1)}`} className={cn('flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-semibold', loc === href ? 'bg-[#d69a3a] text-[#20313c]' : 'text-[#c2cbc5] hover:bg-[#30444e]')}><Icon className="h-4 w-4" />{label}</Link>)}
      </nav>
      <div className="border-t border-[#40505a] p-4"><p className="mb-2 truncate text-xs font-bold">Prime Fleet admin</p><p className="mb-3 truncate text-[10px] text-[#a8b5b0]">{access.data?.email || ''}</p><button onClick={() => void signOut()} className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-xs font-semibold text-[#c2cbc5] hover:bg-[#30444e]" data-testid="button-admin-signout"><LogOut className="h-4 w-4" /> Sign out</button></div>
    </aside>
    {mobile && <button className="fixed inset-0 z-40 bg-black/30 md:hidden" onClick={() => setMobile(false)} aria-label="Close menu" data-testid="button-close-admin-overlay" />}
    <div className="min-w-0 flex-1"><header className="sticky top-0 z-30 flex h-[68px] items-center justify-between border-b border-[#dfdacd] bg-[#f8f6ef]/95 px-4 backdrop-blur md:px-8"><div className="flex items-center gap-3"><button className="grid h-9 w-9 place-items-center rounded-md border border-[#d9d3c7] md:hidden" onClick={() => setMobile(true)} aria-label="Open menu" data-testid="button-open-admin-menu"><Menu className="h-4 w-4" /></button><span className="hidden font-mono text-[10px] uppercase tracking-[.16em] text-[#748080] sm:block">Prime Fleet / Workspace</span></div><a href={publicSite} className="text-xs font-semibold text-[#526167]" data-testid="link-view-public-site">View public site <ArrowUpRight className="ml-1 inline h-3.5 w-3.5" /></a></header>
      <main className="mx-auto max-w-[1440px] px-4 py-7 md:px-8 md:py-9"><div className="mb-7 flex flex-col justify-between gap-4 border-b border-[#ded9cd] pb-6 sm:flex-row sm:items-end"><div><div className="mb-2 font-mono text-[10px] uppercase tracking-[.18em] text-[#9d6925]">Workshop control</div><h1 className="font-display text-3xl font-extrabold tracking-[-.04em] sm:text-[2.1rem]" data-testid="text-admin-page-title">{page}</h1><p className="mt-1 text-sm text-[#657178]" data-testid="text-admin-page-description">{description}</p></div><div className="font-mono text-[10px] uppercase tracking-wider text-[#748080]">{new Date().toLocaleDateString('en-PK', { day: 'numeric', month: 'short', year: 'numeric' })}</div></div>{children}</main>
    </div>
  </div>;
}

function Guard({ children }: { children: ReactNode }) {
  const access = useGetCurrentAccess({ query: { queryKey: getGetCurrentAccessQueryKey(), retry: false } });
  if (access.isLoading) return <div className="grid min-h-[100dvh] place-items-center bg-[#f2efe7]" data-testid="state-admin-auth-loading"><div className="h-20 w-64 animate-pulse rounded-xl bg-[#e7e3d9]" /></div>;
  if (!access.data?.authenticated) return <Redirect to="/login" />;
  if (access.isError || !access.data?.authenticated) return <div className="grid min-h-[100dvh] place-items-center p-5"><P className="max-w-md p-8 text-center"><ShieldCheck className="mx-auto h-8 w-8 text-[#9d6925]" /><h1 className="mt-4 font-display text-2xl font-extrabold">Access could not be confirmed</h1><p className="mt-2 text-sm text-[#68757c]">The server did not verify this session.</p><button onClick={() => access.refetch()} data-testid="button-retry-access" className="mt-4 font-bold text-[#95621e]">Check again</button></P></div>;
  if (!access.data.isAdmin) return <div className="grid min-h-[100dvh] place-items-center p-5"><P className="max-w-md p-8 text-center"><ShieldCheck className="mx-auto h-8 w-8 text-[#9d6925]" /><h1 className="mt-4 font-display text-2xl font-extrabold">Admin access required</h1><p className="mt-2 text-sm text-[#68757c]">Your signed-in account has not been granted administrator access. The server controls this permission.</p><Link href="/" className="mt-5 inline-flex font-bold text-[#95621e]" data-testid="link-access-home">Return to Prime Fleet</Link></P></div>;
  return <>{children}</>;
}
const descriptions: Record<string, string> = {
  dashboard: 'A clear view of what is moving through the workshop.', content: 'Keep the public-facing information current and useful.',
  services: 'Manage the services customers can see and request.', fleet: 'Keep customer accounts and vehicle records together.',
  maintenance: 'Triage new work and keep each request moving.', quotations: 'Prepare, track and update customer estimates.',
  inquiries: 'Review incoming messages and follow up with customers.',
  customers: 'Create a login and password, then give it to the customer.',
};
export function AdminPage({ section }: { section: string }) {
  const names: Record<string, string> = { dashboard: 'Operations overview', content: 'Website content', services: 'Service catalogue', fleet: 'Companies & vehicles', maintenance: 'Maintenance requests', quotations: 'Quotations', inquiries: 'Customer inquiries', customers: 'Customer logins' };
  const component = section === 'dashboard' ? <Dashboard /> : section === 'content' ? <ContentEditor /> : section === 'services' ? <Services /> : section === 'fleet' ? <FleetManager /> : section === 'maintenance' ? <Maintenance /> : section === 'quotations' ? <Quotes /> : section === 'customers' ? <Customers /> : <Inquiries />;
  return <Guard><Shell page={names[section]} description={descriptions[section]}>{component}</Shell></Guard>;
}

function Dashboard() {
  const q = useGetDashboardSummary({ query: { queryKey: getGetDashboardSummaryQueryKey() } }); const d = q.data;
  const stats = [['Fleet companies', d?.companies, Building2, 'bg-[#e8efe8] text-[#427566]'], ['Vehicles on record', d?.vehicles, Truck, 'bg-[#f7edd9] text-[#a77428]'], ['Open requests', d?.openRequests, Wrench, 'bg-[#e7edf0] text-[#526d79]'], ['New inquiries', d?.pendingInquiries, MessageSquareText, 'bg-[#f5e7e1] text-[#a85647]']] as const;
  return <div className="space-y-6"><div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">{stats.map(([label, value, Icon, color], i) => <P key={label} className="p-5" data-testid={`card-dashboard-stat-${i}`}><div className="flex items-center justify-between text-sm font-semibold text-[#69747a]">{label}<span className={cn('grid h-9 w-9 place-items-center rounded-lg', color)}><Icon className="h-4 w-4" /></span></div><div className="mt-5 font-display text-4xl font-extrabold" data-testid={`text-dashboard-stat-${i}`}>{q.isLoading ? '—' : value ?? 0}</div><div className="mt-1 font-mono text-[9px] uppercase tracking-wider text-[#748080]">Current records</div></P>)}</div>
    {q.isError && <Load error retry={() => q.refetch()}> </Load>}
    <div className="grid gap-6 xl:grid-cols-[1.3fr_.7fr]"><P><div className="border-b border-[#e5e0d4] px-5 py-4"><h2 className="font-display text-lg font-extrabold">Recent maintenance</h2><p className="text-xs text-[#68757c]">Latest work logged with the team</p></div><Load loading={q.isLoading} error={q.isError} empty={!q.isLoading && !d?.recentRequests?.length} retry={() => q.refetch()}>{d?.recentRequests?.map((r: any) => <div key={r.id} className="flex flex-col gap-2 border-b border-[#e5e0d4] px-5 py-4 sm:flex-row sm:items-center sm:justify-between" data-testid={`row-recent-request-${r.id}`}><div><b className="text-sm">{r.registrationNumber}</b><p className="text-xs text-[#68757c]">{r.companyName} · {r.issueDescription}</p></div><Status value={r.status} /></div>)}</Load></P>
    <P className="p-5"><Eyebrow>Quick access</Eyebrow><h2 className="font-display text-xl font-extrabold">Keep the desk moving.</h2><div className="mt-4 space-y-2">{nav.slice(1).map(([label, href, Icon]) => <Link key={href} href={href} data-testid={`link-dashboard-quick-${href.split('/').at(-1)}`} className="flex items-center gap-3 rounded-lg border border-[#e4dfd3] px-3 py-3 text-sm font-semibold"><Icon className="h-4 w-4 text-[#9d6925]" />{label}<ArrowRight className="ml-auto h-4 w-4" /></Link>)}</div></P></div></div>;
}

const textFields = ['businessName','contactPerson','phone','email','address','heroTitle','heroSubtitle','heroDescription','aboutTitle','aboutBody','servicesTitle','servicesDescription','vehiclesTitle','contactTitle','contactDescription','footerText','copyrightText','seoTitle','seoDescription','primaryButtonLabel','primaryButtonLink','secondaryButtonLabel','secondaryButtonLink','logoUrl'];
const multiline = new Set(['heroDescription','aboutBody','servicesDescription','contactDescription','footerText','seoDescription','address']);
const labelOf = (s: string) => s.replace(/([A-Z])/g, ' $1').replace(/^./, a => a.toUpperCase());
function ContentEditor() {
  const q = useGetPublicContent(); const update = useUpdateSiteContent(); const client = useQueryClient(); const [notice, setNotice] = useState('');
  function save(e: FormEvent<HTMLFormElement>) { e.preventDefault(); const fd = new FormData(e.currentTarget); const data: Record<string, unknown> = {}; textFields.forEach(k => data[k] = String(fd.get(k) || '')); data.showServices = fd.get('showServices') === 'on'; data.showVehicles = fd.get('showVehicles') === 'on'; update.mutate({ data: data as any }, { onSuccess: () => { client.invalidateQueries({ queryKey: getGetPublicContentQueryKey() }); setNotice('Website content saved.'); } }); }
  return <div className="grid gap-6 xl:grid-cols-[1fr_300px]"><P className="p-5 md:p-7"><div className="mb-6"><Eyebrow>Content management</Eyebrow><h2 className="font-display text-xl font-extrabold">Public site details</h2><p className="mt-1 text-sm text-[#68757c]">Changes are saved directly to the website content record.</p></div><Load loading={q.isLoading} error={q.isError} retry={() => q.refetch()}>{notice && <p className="mb-4 rounded-lg bg-[#e8f1eb] p-3 text-sm font-semibold text-[#356f61]" data-testid="status-content-success">{notice}</p>}{update.isError && <p className="mb-4 text-sm text-red-700" data-testid="status-content-error">Save failed. Your edits remain in the form; try again.</p>}
    <form onSubmit={save} data-testid="form-site-content" className="space-y-7">
      {[['Business identity', textFields.slice(0,5)], ['Homepage hero', textFields.slice(5,8)], ['Page content', textFields.slice(8,17)], ['Buttons', textFields.slice(19,23)], ['SEO & identity image', ['seoTitle','seoDescription','logoUrl']]].map(([group, keys]) => <div key={group as string} className="border-t border-[#e5e0d4] pt-5"><Eyebrow>{group}</Eyebrow><div className="grid gap-4 md:grid-cols-2">{(keys as string[]).map(key => { const value = q.data?.[key as keyof typeof q.data]; return <F key={key} label={labelOf(key)}>{multiline.has(key) ? <textarea name={key} defaultValue={String(value ?? '')} data-testid={`input-content-${key}`} className="min-h-24 w-full rounded-lg border border-[#d9d3c7] bg-[#fffdf8] px-3 py-2 text-sm outline-none focus:border-[#d69a3a]" /> : <I name={key} type={key === 'email' ? 'email' : 'text'} defaultValue={String(value ?? '')} required={key === 'businessName'} data-testid={`input-content-${key}`} />}</F>; })}</div></div>)}
      <div className="border-t border-[#e5e0d4] pt-5"><Eyebrow>Visibility</Eyebrow><div className="flex flex-wrap gap-5">{[['showServices','Show services section'],['showVehicles','Show vehicle categories']].map(([k,l]) => <label key={k} className="flex items-center gap-2 text-sm font-semibold"><input name={k} type="checkbox" defaultChecked={q.data?.[k as 'showServices'|'showVehicles']} data-testid={`input-content-${k}`} className="accent-[#b27b29]" />{l}</label>)}</div></div>
      <div className="flex justify-end"><Btn type="submit" testId="button-save-content" disabled={update.isPending}>{update.isPending ? 'Saving…' : 'Save website content'}<Check className="h-4 w-4" /></Btn></div>
    </form></Load></P><P className="h-fit bg-[#20313c] p-5 text-[#f2eee2]"><Eyebrow>Publishing note</Eyebrow><h3 className="font-display text-xl font-extrabold">Public content is live data.</h3><p className="mt-3 text-sm leading-6 text-[#c1cbc4]">Save publishes all fields from this form together. Keep details current and useful to operators.</p><a href={publicSite} className="mt-4 inline-flex text-sm font-bold text-[#e1ac50]" data-testid="link-content-preview">View public site <ArrowUpRight className="ml-1 h-4 w-4" /></a></P></div>;
}

function Services() {
  const q = useListAdminServices({ query: { queryKey: getListAdminServicesQueryKey() } }); const add = useCreateService(); const edit = useUpdateService(); const del = useDeleteService(); const client = useQueryClient();
  const [editing, setEditing] = useState<any>(null); const [notice, setNotice] = useState('');
  function refresh() { client.invalidateQueries({ queryKey: getListAdminServicesQueryKey() }); client.invalidateQueries({ queryKey: getListPublicServicesQueryKey() }); }
  function save(e: FormEvent<HTMLFormElement>) { e.preventDefault(); const form = e.currentTarget; const fd = new FormData(form); const data = { title: String(fd.get('title')), summary: String(fd.get('summary')), description: String(fd.get('description')), imageUrl: String(fd.get('imageUrl') || '') || null, isPublished: fd.get('isPublished') === 'on', sortOrder: Number(fd.get('sortOrder') || 0) }; const onSuccess = () => { refresh(); setEditing(null); setNotice('Service saved.'); form.reset(); }; editing ? edit.mutate({ id: editing.id, data }, { onSuccess }) : add.mutate({ data }, { onSuccess }); }
  function remove(id: number) { if (window.confirm('Delete this service?')) del.mutate({ id }, { onSuccess: () => { refresh(); setNotice('Service deleted.'); } }); }
  return <div className="grid gap-6 xl:grid-cols-[.75fr_1.25fr]"><P className="p-5"><Eyebrow>{editing ? 'Edit service' : 'New service'}</Eyebrow><h2 className="font-display text-xl font-extrabold">{editing ? 'Update catalogue entry' : 'Add a service'}</h2>{notice && <p className="mt-3 text-sm font-semibold text-[#356f61]" data-testid="status-services-success">{notice}</p>}{(add.isError || edit.isError) && <p className="mt-2 text-sm text-red-700" data-testid="status-services-error">Unable to save this service.</p>}
    <form key={editing?.id || 'new'} onSubmit={save} className="mt-5 grid gap-4" data-testid="form-service"><F label="Title"><I name="title" defaultValue={editing?.title || ''} required data-testid="input-service-title" /></F><F label="Summary"><I name="summary" defaultValue={editing?.summary || ''} data-testid="input-service-summary" /></F><F label="Description"><T name="description" defaultValue={editing?.description || ''} data-testid="input-service-description" /></F><F label="Image URL"><I name="imageUrl" defaultValue={editing?.imageUrl || ''} data-testid="input-service-image-url" /></F><F label="Sort order"><I name="sortOrder" type="number" min="0" defaultValue={editing?.sortOrder ?? 0} data-testid="input-service-sort-order" /></F><label className="flex items-center gap-2 text-sm font-semibold"><input name="isPublished" type="checkbox" defaultChecked={editing?.isPublished ?? true} data-testid="input-service-published" className="accent-[#b27b29]" /> Published on public site</label><div className="flex gap-2"><Btn type="submit" testId="button-save-service" disabled={add.isPending || edit.isPending}>{editing ? 'Save changes' : 'Create service'}<Check className="h-4 w-4" /></Btn>{editing && <Btn kind="outline" onClick={() => setEditing(null)} testId="button-cancel-service">Cancel</Btn>}</div></form></P>
    <P><div className="flex items-center justify-between border-b border-[#e5e0d4] px-5 py-4"><div><h2 className="font-display text-lg font-extrabold">Service catalogue</h2><p className="text-xs text-[#68757c]">Published entries appear on the public site.</p></div><span className="font-mono text-xs text-[#68757c]">{q.data?.length || 0} records</span></div><Load loading={q.isLoading} error={q.isError} retry={() => q.refetch()} empty={!q.isLoading && !q.data?.length}>{q.data?.map((s: any) => <div key={s.id} className="flex flex-col gap-3 border-b border-[#e5e0d4] p-5 last:border-0 sm:flex-row sm:items-center sm:justify-between" data-testid={`row-service-${s.id}`}><div><div className="flex items-center gap-2"><h3 className="font-display font-bold">{s.title}</h3><Status value={s.isPublished ? 'Published' : 'Draft'} /></div><p className="mt-1 text-sm text-[#68757c]">{s.summary}</p><p className="mt-2 font-mono text-[10px] text-[#798282]">Order {s.sortOrder} · {s.slug}</p></div><div className="flex gap-2"><Btn kind="outline" onClick={() => setEditing(s)} testId={`button-edit-service-${s.id}`}>Edit</Btn><Btn kind="danger" disabled={del.isPending} onClick={() => remove(s.id)} testId={`button-delete-service-${s.id}`}>Delete</Btn></div></div>)}</Load></P></div>;
}
