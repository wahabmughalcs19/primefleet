import { useEffect, useState, type FormEvent, type ReactNode, type InputHTMLAttributes, type TextareaHTMLAttributes, type SelectHTMLAttributes } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ArrowDownRight, ArrowRight, ArrowUpRight, BadgeCheck, Check, CircleHelp, Menu, MessageSquareText, Truck, Wrench, X } from 'lucide-react';
import { Link, Route, Switch, Router as WouterRouter, useLocation } from 'wouter';
import { CustomerAccount, CustomerLogin } from './account';
import {
  useCreateContactInquiry, useGetPublicContent, useListPublicBrands,
  useListPublicServices, useListPublicVehicleCategories,
} from '@workspace/api-client-react';

const queryClient = new QueryClient();
const adminUrl = import.meta.env.VITE_ADMIN_URL || (import.meta.env.PROD ? '/admin/' : 'http://localhost:5174');

type AnyRecord = Record<string, unknown>;
const cls = (...parts: (string | false | null | undefined)[]) => parts.filter(Boolean).join(' ');
const knownPages = new Set(['/', '/contact', '/services', '/vehicles', '/about', '/login', '/account']);
function siteHref(value: string | undefined, fallback: string) {
  const link = (value || '').trim();
  if (knownPages.has(link) || link.startsWith('http://') || link.startsWith('https://')) return link;
  return fallback;
}
function SiteButton({ href, fallback, className, testId, children }: { href?: string; fallback: string; className: string; testId: string; children: ReactNode }) {
  const to = siteHref(href, fallback);
  if (to.startsWith('http')) return <a href={to} className={className} data-testid={testId}>{children}</a>;
  return <Link href={to} className={className} data-testid={testId}>{children}</Link>;
}
const money = (value: number) => `PKR ${Number(value || 0).toLocaleString('en-PK')}`;
const dateLabel = (value?: string) => value ? new Date(value).toLocaleDateString('en-PK', { day: 'numeric', month: 'short', year: 'numeric' }) : '—';

function Button({ children, onClick, kind = 'primary', type = 'button', disabled, testId }: { children: ReactNode; onClick?: () => void; kind?: 'primary' | 'quiet' | 'outline' | 'danger'; type?: 'button' | 'submit'; disabled?: boolean; testId: string }) {
  return <button type={type} onClick={onClick} disabled={disabled} data-testid={testId} className={cls('inline-flex min-h-10 items-center justify-center gap-2 rounded-lg px-4 text-sm font-semibold transition hover:-translate-y-px disabled:cursor-not-allowed disabled:opacity-50', kind === 'primary' && 'bg-primary text-primary-foreground shadow-sm', kind === 'quiet' && 'text-muted-foreground hover:bg-muted', kind === 'outline' && 'border border-border bg-card text-foreground hover:bg-muted', kind === 'danger' && 'border border-red-200 bg-red-50 text-red-800')}>{children}</button>;
 }

function App() {
  return <QueryClientProvider client={queryClient}><WouterRouter><Switch>
    <Route path="/" component={HomePage} />
    <Route path="/services"><ContentPage page="services" /></Route>
    <Route path="/vehicles"><ContentPage page="vehicles" /></Route>
    <Route path="/about"><ContentPage page="about" /></Route>
    <Route path="/contact" component={ContactPage} />
    <Route path="/login" component={LoginRoute} />
    <Route path="/account" component={AccountRoute} />
    <Route><div className="grid min-h-[100dvh] place-items-center px-5"><div className="text-center"><div className="font-mono text-xs uppercase tracking-[.2em] text-[#9d6925]">404 / Not found</div><h1 className="mt-3 font-display text-4xl font-extrabold text-[#20313c]">This route is off the map.</h1><Link href="/" data-testid="link-not-found-home" className="mt-5 inline-flex rounded-lg bg-[#20313c] px-4 py-3 text-sm font-bold text-[#f3eee1]">Back to Prime Fleet</Link></div></div></Route>
  </Switch></WouterRouter></QueryClientProvider>;
}
export default App;
function Field({ label, children, testId }: { label: string; children: ReactNode; testId?: string }) {
  return <label className="grid gap-1.5 text-sm font-semibold text-foreground" data-testid={testId}><span>{label}</span>{children}</label>;
}
function Input(props: InputHTMLAttributes<HTMLInputElement> & { 'data-testid'?: string }) {
  return <input {...props} className={cls('h-10 w-full rounded-lg border border-input bg-card px-3 text-sm font-normal outline-none transition placeholder:text-muted-foreground/70 focus:border-primary focus:ring-2 focus:ring-primary/20', props.className)} />;
}
function Textarea(props: TextareaHTMLAttributes<HTMLTextAreaElement> & { 'data-testid'?: string }) {
  return <textarea {...props} className={cls('min-h-24 w-full rounded-lg border border-input bg-card px-3 py-2.5 text-sm font-normal outline-none transition placeholder:text-muted-foreground/70 focus:border-primary focus:ring-2 focus:ring-primary/20', props.className)} />;
}
function Select(props: SelectHTMLAttributes<HTMLSelectElement> & { 'data-testid'?: string }) {
  return <select {...props} className={cls('h-10 w-full rounded-lg border border-input bg-card px-3 text-sm font-normal outline-none focus:border-primary focus:ring-2 focus:ring-primary/20', props.className)} />;
}
function Panel({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <section className={cls('rounded-xl border border-border bg-card shadow-[0_2px_12px_rgba(40,44,39,.035)]', className)}>{children}</section>;
}
function Eyebrow({ children }: { children: ReactNode }) { return <div className="mb-3 font-mono text-[10px] font-medium uppercase tracking-[.18em] text-[#9d6925]">{children}</div>; }
function QueryState({ loading, error, retry, empty, emptyMessage = 'Nothing here yet. New records will appear here.', children }: { loading?: boolean; error?: boolean; retry?: () => void; empty?: boolean; emptyMessage?: ReactNode; children?: ReactNode }) {
  if (loading) return <div className="space-y-3 p-5" data-testid="state-loading">{[1, 2, 3].map(n => <div key={n} className="h-12 animate-pulse rounded-lg bg-muted" />)}</div>;
  if (error) return <div className="p-8 text-center" data-testid="state-error"><CircleHelp className="mx-auto mb-2 h-6 w-6 text-muted-foreground" /><p className="text-sm text-muted-foreground">This information could not be loaded.</p>{retry && <Button kind="outline" onClick={retry} testId="button-retry">Try again</Button>}</div>;
  if (empty) return <div className="p-9 text-center text-sm text-muted-foreground" data-testid="state-empty">{emptyMessage}</div>;
  return <>{children}</>;
}
function Toast({ message, onClose }: { message: string; onClose: () => void }) {
  useEffect(() => { const id = window.setTimeout(onClose, 3800); return () => window.clearTimeout(id); }, [message, onClose]);
  return <div role="status" data-testid="status-toast" className="fixed bottom-5 right-5 z-[80] flex max-w-sm items-center gap-3 rounded-xl border border-emerald-200 bg-[#eff8f2] px-4 py-3 text-sm font-medium text-emerald-900 shadow-xl"><Check className="h-4 w-4" />{message}<button onClick={onClose} data-testid="button-close-toast" aria-label="Dismiss"><X className="h-4 w-4" /></button></div>;
}

function PublicFrame({ children, content }: { children: ReactNode; content?: any }) {
  const [menu, setMenu] = useState(false);
  const name = content?.businessName || 'Prime Fleet Solutions';
  useEffect(() => {
    const title = content?.seoTitle?.trim() || name;
    const description = content?.seoDescription?.trim() || content?.heroDescription?.trim() || 'Heavy vehicle and fleet maintenance support in Rahim Yar Khan, Pakistan.';
    document.title = title;
    document.querySelector<HTMLMetaElement>('meta[name="description"]')?.setAttribute('content', description);
    document.querySelector<HTMLMetaElement>('meta[property="og:title"]')?.setAttribute('content', title);
    document.querySelector<HTMLMetaElement>('meta[property="og:description"]')?.setAttribute('content', description);
    document.querySelector<HTMLMetaElement>('meta[name="twitter:title"]')?.setAttribute('content', title);
    document.querySelector<HTMLMetaElement>('meta[name="twitter:description"]')?.setAttribute('content', description);
  }, [content?.seoTitle, content?.seoDescription, content?.heroDescription, name]);
  return <div className="min-h-[100dvh] text-foreground">
    <div className="border-b border-[#2c424d] bg-[#20313c] text-[#e9e5d8]"><div className="mx-auto flex max-w-7xl justify-between px-5 py-2 text-[11px]"><span className="flex items-center gap-2"><span className="h-1.5 w-1.5 rounded-full bg-[#dfa443]" /> Fleet maintenance, made dependable</span><span className="hidden sm:block">{content?.phone || 'Rahim Yar Khan, Punjab'}</span></div></div>
    <header className="sticky top-0 z-40 border-b border-border/80 bg-[#fbf8ef]/95 backdrop-blur">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-3.5">
        <Link href="/" data-testid="link-brand-home" className="flex items-center gap-3">
          <span className="grid h-10 w-10 place-items-center overflow-hidden rounded-xl bg-[#20313c] text-[#e3aa4b]">{content?.logoUrl ? <img src={content.logoUrl} alt="" className="h-full w-full object-cover" data-testid="img-site-logo" /> : <Truck className="h-5 w-5" />}</span>
          <span><strong className="block font-display text-[15px] leading-tight tracking-tight">{name}</strong><small className="font-mono text-[9px] uppercase tracking-[.15em] text-muted-foreground">Rahim Yar Khan · Pakistan</small></span>
        </Link>
        <button className="grid h-10 w-10 place-items-center rounded-lg border border-border md:hidden" onClick={() => setMenu(!menu)} aria-label="Toggle navigation" data-testid="button-public-menu">{menu ? <X /> : <Menu />}</button>
        <nav className={cls('absolute left-0 right-0 top-full flex flex-col gap-1 border-b border-border bg-[#fbf8ef] p-4 md:static md:flex md:flex-row md:items-center md:gap-7 md:border-0 md:bg-transparent md:p-0', !menu && 'hidden md:flex')} data-testid="nav-public">
          {[['Services', '/services'], ['Vehicles', '/vehicles'], ['About', '/about'], ['Contact', '/contact'], ['My account', '/account']].map(([label, path]) => <Link key={path} href={path} onClick={() => setMenu(false)} data-testid={`link-nav-${label.toLowerCase().replace(' ', '-')}`} className="rounded-md px-2 py-2 text-sm font-semibold text-[#40505a] hover:text-[#9d6925]">{label}</Link>)}
          <a href={adminUrl} data-testid="link-portal" className="mt-2 text-sm font-semibold text-[#68757c] md:mt-0">Staff</a>
        </nav>
      </div>
    </header>{children}
    <footer className="bg-[#20313c] text-[#e9e5d8]"><div className="mx-auto grid max-w-7xl gap-10 px-5 py-12 md:grid-cols-[1.2fr_.8fr_.8fr]">
      <div><div className="flex items-center gap-3"><span className="grid h-10 w-10 place-items-center rounded-xl bg-[#d69a3a] text-[#20313c]"><Truck className="h-5 w-5" /></span><b>{name}</b></div><p className="mt-4 max-w-sm text-sm leading-6 text-[#b6c0bf]">{content?.footerText || 'Keeping commercial vehicles working with clear communication and dependable workshop care.'}</p></div>
      <div><Eyebrow>Explore</Eyebrow><div className="grid gap-2 text-sm text-[#d2d7d1]"><Link href="/services" data-testid="link-footer-services">Services</Link><Link href="/vehicles" data-testid="link-footer-vehicles">Vehicle categories</Link><Link href="/about" data-testid="link-footer-about">About us</Link><Link href="/contact" data-testid="link-footer-contact">Contact</Link></div></div>
      <div><Eyebrow>Workshop</Eyebrow><p className="text-sm leading-6 text-[#d2d7d1]" data-testid="text-footer-address">{content?.address || 'Rahim Yar Khan, Punjab, Pakistan'}</p><p className="mt-2 text-sm text-[#d2d7d1]">{content?.phone || ''}</p></div>
    </div><div className="border-t border-[#3b4b54]"><div className="mx-auto flex max-w-7xl flex-col gap-1 px-5 py-4 text-xs text-[#aab4b4] sm:flex-row sm:justify-between"><span>{content?.copyrightText || `© ${new Date().getFullYear()} ${name}`}</span><span>Built for the road ahead.</span></div></div></footer>
  </div>;
}
function usePublicContent() { return useGetPublicContent(); }
function LoginRoute() { const content = usePublicContent(); return <PublicFrame content={content.data}><CustomerLogin /></PublicFrame>; }
function AccountRoute() { const content = usePublicContent(); return <PublicFrame content={content.data}><CustomerAccount /></PublicFrame>; }
function PublicError() { return <div className="mx-auto max-w-xl px-5 py-24 text-center"><h2 className="font-display text-3xl font-extrabold">The workshop desk is briefly offline.</h2><p className="mt-3 text-muted-foreground">Please refresh in a moment or contact the team directly.</p><Button kind="outline" onClick={() => window.location.reload()} testId="button-public-retry">Reload page</Button></div>; }

function HomePage() {
  const { data: content, isLoading: contentLoading, isError: contentError } = usePublicContent();
  const { data: services, isLoading: servicesLoading } = useListPublicServices();
  const { data: categories, isLoading: categoriesLoading } = useListPublicVehicleCategories();
  const [location, setLocation] = useLocation();
  const serviceRows = services || [];
  return <PublicFrame content={content}>
    <main>
      <section className="public-grid relative overflow-hidden bg-[#f0eadb]">
        <div className="mx-auto grid min-h-[570px] max-w-7xl items-center gap-10 px-5 py-16 lg:grid-cols-[1.02fr_.98fr] lg:py-20">
          <div className="relative z-10 max-w-2xl fade-up"><Eyebrow>Workshop support · Rahim Yar Khan</Eyebrow>
            <p className="mb-4 font-mono text-[11px] uppercase tracking-[.17em] text-[#58716e]">Commercial vehicle care that keeps you moving</p>
            <h1 className="font-display text-5xl font-extrabold leading-[1.05] tracking-[-.055em] text-[#20313c] sm:text-6xl lg:text-[4.4rem]" data-testid="text-home-hero-title">{contentLoading ? 'Loading fleet services…' : content?.heroTitle || 'Keep your fleet moving.'}</h1>
            <p className="mt-4 font-display text-xl font-semibold leading-snug text-[#53716d]" data-testid="text-home-hero-subtitle">{content?.heroSubtitle || ''}</p>
            <p className="mt-5 max-w-xl text-base leading-7 text-[#5a676b]" data-testid="text-home-hero-description">{content?.heroDescription || ''}</p>
            <div className="mt-8 flex flex-wrap gap-3">
              <SiteButton href={content?.primaryButtonLink} fallback="/contact" testId="link-home-primary" className="inline-flex min-h-12 items-center gap-2 rounded-xl bg-[#20313c] px-5 text-sm font-bold text-[#f6f1e6] shadow-lg shadow-[#20313c]/15">{content?.primaryButtonLabel || 'Talk to our team'}<ArrowRight className="h-4 w-4" /></SiteButton>
              <SiteButton href={content?.secondaryButtonLink} fallback="/services" testId="link-home-secondary" className="inline-flex min-h-12 items-center gap-2 rounded-xl border border-[#c8b99a] bg-white px-5 text-sm font-bold text-[#20313c]">{content?.secondaryButtonLabel || 'See services'}<ArrowDownRight className="h-4 w-4" /></SiteButton>
            </div>
            <p className="mt-4 text-sm text-[#5a676b]">Already a customer? <Link href="/login" className="font-bold text-[#8e5c1c]">Check your job status</Link></p>
            <div className="mt-8 flex items-center gap-4 border-t border-[#cfc9b7] pt-5 text-sm font-semibold text-[#4d5c60]"><BadgeCheck className="h-5 w-5 text-[#49756a]" /> Call, tell us the problem, and follow the status in your account.</div>
          </div>
          <div className="relative min-h-[350px] lg:min-h-[440px]" aria-label="Prime Fleet workshop overview">
            <div className="absolute inset-3 rounded-[1.8rem] bg-[#d9ad63] rotate-2" />
            <div className="absolute inset-0 overflow-hidden rounded-[1.8rem] border-[8px] border-[#fbf8ef] bg-[#263b43] shadow-2xl">
              <div className="absolute inset-0 bg-[linear-gradient(135deg,rgba(217,164,72,.14),transparent_40%),linear-gradient(0deg,#15242c_0%,transparent_52%)]" />
              <div className="absolute inset-0 opacity-40" style={{ backgroundImage: 'linear-gradient(90deg,transparent 49.8%,rgba(240,230,204,.13) 50%,transparent 50.2%),linear-gradient(rgba(240,230,204,.1) 1px,transparent 1px)', backgroundSize: '90px 70px' }} />
              <div className="absolute bottom-14 left-7 right-7 h-36 rounded-t-[55%] border-t-[5px] border-[#a4a498] bg-[#1d3039]">
                <div className="absolute -top-14 left-[12%] h-14 w-[56%] rounded-t-[48%] border-x-4 border-t-4 border-[#d69a3a] bg-[#c9a15c]" />
                <div className="absolute -top-8 left-[24%] h-9 w-[31%] rounded-t-full bg-[#243c45]" />
                <div className="absolute -top-3 right-[15%] h-3 w-8 rounded bg-[#f6d17d]" />
                <div className="absolute -bottom-6 left-[18%] h-14 w-14 rounded-full border-[8px] border-[#20262a] bg-[#b6b5aa]" />
                <div className="absolute -bottom-6 right-[15%] h-14 w-14 rounded-full border-[8px] border-[#20262a] bg-[#b6b5aa]" />
              </div>
              <div className="absolute left-6 top-6 rounded-full border border-white/20 bg-[#172a31]/65 px-3 py-2 font-mono text-[9px] uppercase tracking-[.17em] text-[#ece8da]"><span className="mr-2 inline-block h-1.5 w-1.5 rounded-full bg-[#d69a3a]" /> Fleet-ready workshop</div>
              <div className="absolute bottom-5 left-5 right-5 flex justify-between border-t border-white/20 pt-3 font-mono text-[9px] uppercase tracking-[.15em] text-[#c6d1c9]"><span>Rahim Yar Khan</span><span>Reliable by design</span></div>
            </div>
            <div className="absolute -bottom-5 -left-4 rounded-xl border border-[#d8d1c0] bg-[#fbf8ef] p-4 shadow-lg sm:left-[-2rem]"><div className="font-mono text-[9px] uppercase tracking-[.18em] text-[#8a6b3b]">One fleet. One clear plan.</div><div className="mt-1 font-display text-lg font-extrabold text-[#20313c]">Built around uptime.</div></div>
          </div>
        </div>
      </section>
      <section className="bg-[#20313c] text-[#f3eee1]"><div className="mx-auto grid max-w-7xl gap-6 px-5 py-8 sm:grid-cols-3">
        {[['1', 'Tell us the vehicle', 'Share the number plate and what is wrong.'], ['2', 'We take the job', 'The workshop records the work and keeps the status clear.'], ['3', 'You can check it', 'Sign in to see only your requests and messages.']].map(([no, title, body]) => <div className="rounded-2xl bg-white/5 p-4" key={no}><span className="grid h-8 w-8 place-items-center rounded-full bg-[#dba64d] text-sm font-bold text-[#20313c]">{no}</span><h3 className="mt-3 font-display text-lg font-bold">{title}</h3><p className="mt-1 text-sm leading-6 text-[#d5ddd8]">{body}</p></div>)}
      </div></section>
      {content?.showServices !== false && <section className="mx-auto max-w-7xl px-5 py-20">
        <div className="grid gap-8 md:grid-cols-[.8fr_1.2fr]"><div><Eyebrow>How we help</Eyebrow><h2 className="font-display text-4xl font-extrabold tracking-[-.04em] text-[#20313c]" data-testid="text-home-services-title">{content?.servicesTitle || 'Maintenance that works around your operation.'}</h2><p className="mt-4 max-w-md leading-7 text-muted-foreground">{content?.servicesDescription || ''}</p><Link href="/services" className="mt-6 inline-flex items-center gap-2 text-sm font-bold text-[#8e5c1c]" data-testid="link-home-all-services">View all services <ArrowRight className="h-4 w-4" /></Link></div>
          <div className="grid gap-3 sm:grid-cols-2">{servicesLoading ? <div className="h-36 animate-pulse rounded-xl bg-muted" /> : serviceRows.length ? serviceRows.slice(0, 4).map((s: any, i: number) => <div key={s.id} className="rounded-xl border border-border bg-card p-5 transition hover:-translate-y-1 hover:shadow-lg" data-testid={`card-home-service-${s.id}`}><div className="flex items-start justify-between"><span className="font-mono text-xs text-[#a97832]">0{i + 1}</span><ArrowUpRight className="h-4 w-4 text-muted-foreground" /></div><h3 className="mt-6 font-display text-xl font-extrabold text-[#20313c]">{s.title}</h3><p className="mt-2 text-sm leading-6 text-muted-foreground">{s.summary}</p></div>) : <div className="rounded-xl border border-dashed border-[#cfc9b7] p-5 text-sm leading-6 text-muted-foreground">Service listings are being prepared. <Link href="/contact" className="font-bold text-[#8e5c1c]">Contact us for current availability.</Link></div>}</div>
        </div>
      </section>}
      {content?.showVehicles !== false && <section className="border-y border-[#d8d2c5] bg-[#e9e4d7]"><div className="mx-auto grid max-w-7xl gap-10 px-5 py-16 md:grid-cols-[1fr_1fr] md:items-center"><div><Eyebrow>Built for working vehicles</Eyebrow><h2 className="font-display text-4xl font-extrabold tracking-[-.04em] text-[#20313c]">{content?.vehiclesTitle || 'Support for the vehicles that keep business moving.'}</h2><p className="mt-4 max-w-xl leading-7 text-[#606d6d]">From a single commercial vehicle to a busy multi-vehicle fleet, get a clear path to the right workshop support.</p><Link href="/vehicles" data-testid="link-home-vehicle-categories" className="mt-6 inline-flex items-center gap-2 font-bold text-[#8e5c1c]">See vehicle categories <ArrowRight className="h-4 w-4" /></Link></div><div className="grid grid-cols-2 gap-3">{categoriesLoading ? <div className="h-28 animate-pulse rounded-xl bg-white/60" /> : (categories || []).slice(0, 4).map((c: any) => <div key={c.id} className="rounded-xl border border-[#d2ccbd] bg-[#fbf8ef] p-4" data-testid={`card-home-category-${c.id}`}><Truck className="h-5 w-5 text-[#648078]" /><h3 className="mt-3 font-display font-bold">{c.name}</h3><p className="mt-1 text-xs leading-5 text-muted-foreground">{c.description}</p></div>)}</div></div></section>}
      <section className="mx-auto max-w-7xl px-5 py-20"><div className="grid gap-8 rounded-2xl bg-[#d9a44a] px-7 py-10 text-[#20313c] md:grid-cols-[1fr_auto] md:items-center md:px-12"><div><Eyebrow>Let's get your fleet moving</Eyebrow><h2 className="max-w-2xl font-display text-3xl font-extrabold tracking-[-.04em] sm:text-4xl">Talk through your maintenance needs with our local team.</h2></div><Link href="/contact" data-testid="link-home-contact-cta" className="inline-flex h-12 items-center justify-center gap-2 rounded-lg bg-[#20313c] px-5 text-sm font-bold text-[#f7f0df]">Get in touch <ArrowRight className="h-4 w-4" /></Link></div></section>
    </main>
  </PublicFrame>;
}

function ContentPage({ page }: { page: 'services' | 'vehicles' | 'about' }) {
  const { data: content } = usePublicContent();
  const services = useListPublicServices();
  const categories = useListPublicVehicleCategories();
  const brands = useListPublicBrands();
  const title = page === 'services' ? content?.servicesTitle : page === 'vehicles' ? content?.vehiclesTitle : content?.aboutTitle;
  const description = page === 'services' ? content?.servicesDescription : page === 'about' ? content?.aboutBody : '';
  return <PublicFrame content={content}><main className="min-h-[65vh]">
    <section className="public-grid border-b border-border bg-[#eee8da]"><div className="mx-auto max-w-7xl px-5 py-16 md:py-20"><Eyebrow>{page === 'about' ? 'Who we are' : `Prime Fleet / ${page}`}</Eyebrow><h1 className="max-w-4xl font-display text-4xl font-extrabold tracking-[-.05em] text-[#20313c] md:text-6xl" data-testid={`text-${page}-title`}>{title || 'Loading…'}</h1>{description && <p className="mt-5 max-w-3xl whitespace-pre-line text-base leading-7 text-[#59686b]" data-testid={`text-${page}-description`}>{description}</p>}</div></section>
    {page === 'services' && <section className="mx-auto max-w-7xl px-5 py-14"><QueryState loading={services.isLoading} error={services.isError} retry={() => services.refetch()} empty={!services.isLoading && !services.data?.length} emptyMessage={<><p>Service listings are being prepared.</p><Link href="/contact" className="mt-3 inline-flex font-bold text-[#8e5c1c]" data-testid="link-services-contact-empty">Contact the team for current availability <ArrowRight className="ml-1 h-4 w-4" /></Link></>}><div className="grid gap-4 md:grid-cols-2">{(services.data || []).map((s: any, i: number) => <Panel key={s.id} className="overflow-hidden" ><div className="grid min-h-56 md:grid-cols-[.8fr_1.2fr]"><div className="relative min-h-48 bg-[#263b43]">{s.imageUrl ? <img src={s.imageUrl} alt={s.title} className="h-full w-full object-cover" data-testid={`img-service-${s.id}`} /> : <div className="public-grid flex h-full min-h-48 items-center justify-center text-[#d8aa56]"><Wrench className="h-12 w-12" /></div>}</div><div className="p-6"><span className="font-mono text-xs text-[#9d6925]">SERVICE / {String(i + 1).padStart(2, '0')}</span><h2 className="mt-3 font-display text-2xl font-extrabold text-[#20313c]" data-testid={`text-service-title-${s.id}`}>{s.title}</h2><p className="mt-2 leading-6 text-muted-foreground">{s.description || s.summary}</p></div></div></Panel>)}</div></QueryState></section>}
    {page === 'vehicles' && <section className="mx-auto max-w-7xl px-5 py-14"><QueryState loading={categories.isLoading || brands.isLoading} error={categories.isError || brands.isError} empty={!categories.isLoading && !categories.data?.length}><div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{(categories.data || []).map((v: any, i: number) => <Panel key={v.id} className="p-6" data-testid={`card-vehicle-category-${v.id}`}><div className="flex justify-between"><span className="font-mono text-xs text-[#9d6925]">CATEGORY / {String(i + 1).padStart(2, '0')}</span><Truck className="h-5 w-5 text-[#628178]" /></div><h2 className="mt-8 font-display text-2xl font-extrabold text-[#20313c]">{v.name}</h2><p className="mt-2 min-h-12 text-sm leading-6 text-muted-foreground">{v.description}</p></Panel>)}</div><div className="mt-10 border-t border-border pt-7"><Eyebrow>Brands we work with</Eyebrow><div className="flex flex-wrap gap-2">{(brands.data || []).map((b: any) => <span key={b.id} className="rounded-full border border-border bg-card px-4 py-2 text-sm font-semibold" data-testid={`tag-brand-${b.id}`}>{b.name}</span>)}</div></div></QueryState></section>}
    {page === 'about' && <section className="mx-auto grid max-w-7xl gap-10 px-5 py-16 md:grid-cols-[.7fr_1.3fr]"><div className="rounded-2xl bg-[#20313c] p-8 text-[#f3eee1]"><Eyebrow>Our promise</Eyebrow><h2 className="font-display text-3xl font-extrabold leading-tight">Dependable service starts with a clear conversation.</h2><Truck className="mt-10 h-16 w-16 text-[#d69a3a]" /></div><div className="space-y-5"><p className="whitespace-pre-line text-lg leading-8 text-[#56666b]" data-testid="text-about-copy">{content?.aboutBody || ''}</p><div className="grid gap-3 sm:grid-cols-3">{[['Local', 'Rooted in Rahim Yar Khan'], ['Practical', 'Focused on what keeps you moving'], ['Clear', 'Updates without the guesswork']].map(([a,b]) => <Panel key={a} className="p-4"><b className="font-display text-lg">{a}</b><p className="mt-1 text-sm text-muted-foreground">{b}</p></Panel>)}</div></div></section>}
  </main></PublicFrame>;
}
function ContactPage() {
  const { data: content } = usePublicContent();
  const create = useCreateContactInquiry();
  const [sent, setSent] = useState(false);
  function submit(e: FormEvent<HTMLFormElement>) { e.preventDefault(); const form = e.currentTarget; const f = new FormData(form); setSent(false); create.mutate({ data: { name: String(f.get('name')), email: String(f.get('email')), phone: String(f.get('phone')), subject: String(f.get('subject')), message: String(f.get('message')) } }, { onSuccess: () => { form.reset(); setSent(true); } }); }
  return <PublicFrame content={content}><main><section className="public-grid bg-[#eee8da]"><div className="mx-auto max-w-7xl px-5 py-16"><Eyebrow>Contact the workshop</Eyebrow><h1 className="max-w-3xl font-display text-5xl font-extrabold tracking-[-.05em] text-[#20313c]" data-testid="text-contact-title">{content?.contactTitle || 'Let’s talk about your fleet.'}</h1><p className="mt-4 max-w-2xl leading-7 text-[#5a676b]">{content?.contactDescription || ''}</p></div></section><section className="mx-auto grid max-w-7xl gap-10 px-5 py-14 lg:grid-cols-[.8fr_1.2fr]"><div><Eyebrow>Reach us directly</Eyebrow><h2 className="font-display text-2xl font-extrabold">A real person, ready to help.</h2><div className="mt-6 space-y-4">{[['Phone', content?.phone], ['Email', content?.email], ['Address', content?.address]].map(([a,b]) => <div className="border-b border-border pb-4" key={a}><div className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">{a}</div><div className="mt-1 font-semibold" data-testid={`text-contact-${String(a).toLowerCase()}`}>{b || '—'}</div></div>)}</div></div>
      <Panel className="p-6 md:p-8"><div className="flex items-start justify-between"><div><Eyebrow>Send an inquiry</Eyebrow><h2 className="font-display text-2xl font-extrabold">Tell us what you need.</h2></div><MessageSquareText className="h-6 w-6 text-[#9d6925]" /></div>
        {sent && <div className="my-4 rounded-lg bg-[#e8f1eb] p-3 text-sm font-semibold text-[#356f61]" data-testid="status-contact-success">Thanks — your inquiry has been received.</div>}
        {create.isError && <p className="my-3 text-sm text-destructive" data-testid="status-contact-error">Could not send your inquiry. Please try again.</p>}
        <form onSubmit={submit} className="mt-6 grid gap-4 sm:grid-cols-2" data-testid="form-contact-inquiry">
          <Field label="Your name"><Input name="name" required maxLength={180} data-testid="input-contact-name" /></Field><Field label="Email"><Input name="email" type="email" required data-testid="input-contact-email" /></Field>
          <Field label="Phone"><Input name="phone" data-testid="input-contact-phone" /></Field><Field label="Subject"><Input name="subject" data-testid="input-contact-subject" /></Field>
          <Field label="Message"><Textarea name="message" required className="sm:min-h-36" data-testid="input-contact-message" /></Field><div className="flex items-end"><Button type="submit" disabled={create.isPending} testId="button-submit-inquiry">{create.isPending ? 'Sending…' : 'Send inquiry'}<ArrowRight className="h-4 w-4" /></Button></div>
        </form></Panel></section></main></PublicFrame>;
}
