import { Suspense, lazy } from 'react';
import { HashRouter, Routes, Route, useLocation } from 'react-router-dom';
import { useEffect } from 'react';
import { Loader2 } from 'lucide-react';
import { StoreProvider } from './lib/store';
import Layout from './components/Layout';

const Landing = lazy(() => import('./pages/Landing'));
const SearchPage = lazy(() => import('./pages/Search'));
const Checkout = lazy(() => import('./pages/Checkout'));
const MyBookings = lazy(() => import('./pages/MyBookings'));
const Chat = lazy(() => import('./pages/Chat'));
const LspDashboard = lazy(() => import('./pages/LspDashboard'));
const LspContainerForm = lazy(() => import('./pages/LspContainerForm'));
const AdminDashboard = lazy(() => import('./pages/AdminDashboard'));
const AdminLspQueue = lazy(() => import('./pages/AdminLspQueue'));
const AdminDisputes = lazy(() => import('./pages/AdminDisputes'));
const Login = lazy(() => import('./pages/Login'));
const OpenSourceHub = lazy(() => import('./pages/OpenSourceHub'));

function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => { window.scrollTo(0, 0); }, [pathname]);
  return null;
}

function PageLoader() {
  return (
    <div className="flex h-[60vh] flex-col items-center justify-center gap-3 text-ink/50">
      <Loader2 size={30} className="animate-spin text-flame" />
      <p className="font-mono text-[11px] font-semibold uppercase tracking-widest">Loading module…</p>
    </div>
  );
}

export default function App() {
  return (
    <StoreProvider>
      <HashRouter>
        <ScrollToTop />
        <Layout>
          <Suspense fallback={<PageLoader />}>
            <Routes>
              <Route path="/" element={<Landing />} />
              <Route path="/search" element={<SearchPage />} />
              <Route path="/checkout/:containerId" element={<Checkout />} />
              <Route path="/my-bookings" element={<MyBookings />} />
              <Route path="/chat" element={<Chat />} />
              <Route path="/lsp" element={<LspDashboard />} />
              <Route path="/lsp/containers/new" element={<LspContainerForm />} />
              <Route path="/lsp/containers/:containerId/edit" element={<LspContainerForm />} />
              <Route path="/admin" element={<AdminDashboard />} />
              <Route path="/admin/lsp-queue" element={<AdminLspQueue />} />
              <Route path="/admin/disputes" element={<AdminDisputes />} />
              <Route path="/login" element={<Login />} />
              <Route path="/open-source" element={<OpenSourceHub />} />
              <Route path="*" element={<Landing />} />
            </Routes>
          </Suspense>
        </Layout>
      </HashRouter>
    </StoreProvider>
  );
}
