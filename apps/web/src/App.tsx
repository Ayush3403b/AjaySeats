import { lazy, Suspense } from 'react';
import { Route, Routes } from 'react-router-dom';
import { Layout } from './components/Layout.js';

const AdminApp = lazy(() => import('./admin/AdminApp.js'));

const Home = lazy(() => import('./pages/Home.js'));
const Products = lazy(() => import('./pages/Products.js'));
const ProductDetail = lazy(() => import('./pages/ProductDetail.js'));
const Materials = lazy(() => import('./pages/Materials.js'));
const About = lazy(() => import('./pages/About.js'));
const RequestQuote = lazy(() => import('./pages/RequestQuote.js'));
const Contact = lazy(() => import('./pages/Contact.js'));
const Privacy = lazy(() => import('./pages/Legal.js').then((m) => ({ default: m.Privacy })));
const Terms = lazy(() => import('./pages/Legal.js').then((m) => ({ default: m.Terms })));
const NotFound = lazy(() => import('./pages/NotFound.js'));

/** Public site. Every page is lazy-loaded; Layout provides the suspense fallback around the outlet. */
export default function App() {
  return (
    <Routes>
      <Route path="admin/*" element={<Suspense fallback={null}><AdminApp /></Suspense>} />
      <Route element={<Layout />}>
        <Route index element={<Home />} />
        <Route path="products" element={<Products />} />
        <Route path="products/:slug" element={<ProductDetail />} />
        <Route path="materials" element={<Materials />} />
        <Route path="about" element={<About />} />
        <Route path="request-quote" element={<RequestQuote />} />
        <Route path="contact" element={<Contact />} />
        <Route path="privacy" element={<Privacy />} />
        <Route path="terms" element={<Terms />} />
        <Route path="*" element={<NotFound />} />
      </Route>
    </Routes>
  );
}
