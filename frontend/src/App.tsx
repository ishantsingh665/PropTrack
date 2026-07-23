import React, { Suspense, lazy } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';

// Keep Login/Register eager
import Login from './pages/Login';
import Register from './pages/Register';
import ProtectedRoute from './components/ProtectedRoute';
import Layout from './components/Layout';

// Lazy load everything behind the auth wall
const Dashboard        = lazy(() => import('./pages/Dashboard'));
const Properties       = lazy(() => import('./pages/Properties'));
const PropertyDetails  = lazy(() => import('./pages/PropertyDetails'));
const Companies        = lazy(() => import('./pages/Companies'));
const CompanyDetails   = lazy(() => import('./pages/CompanyDetails'));
const Transfers        = lazy(() => import('./pages/Transfers'));
const BulkImport       = lazy(() => import('./pages/BulkImport'));
const AuditLog         = lazy(() => import('./pages/AuditLog'));
const Duplicates       = lazy(() => import('./pages/Duplicates'));
const Snapshots        = lazy(() => import('./pages/Snapshots'));
const SnapshotDetails  = lazy(() => import('./pages/SnapshotDetails'));
const GeocodingManagement = lazy(() => import('./pages/GeocodingManagement'));
const UserManagement   = lazy(() => import('./pages/UserManagement'));
const PropertyTypeManager = lazy(() => import('./pages/PropertyTypeManager'));

const LoadingFallback = () => (
  <div className="flex items-center justify-center h-64 text-gray-400 text-sm">
    Loading...
  </div>
);

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        
        <Route element={<ProtectedRoute />}>
          <Route element={<Layout />}>
            <Route path="/" element={<Suspense fallback={<LoadingFallback />}><Dashboard /></Suspense>} />
            <Route path="/companies" element={<Suspense fallback={<LoadingFallback />}><Companies /></Suspense>} />
            <Route path="/companies/:id" element={<Suspense fallback={<LoadingFallback />}><CompanyDetails /></Suspense>} />
            <Route path="/properties" element={<Suspense fallback={<LoadingFallback />}><Properties /></Suspense>} />
            <Route path="/properties/:id" element={<Suspense fallback={<LoadingFallback />}><PropertyDetails /></Suspense>} />
            <Route path="/transfers" element={<Suspense fallback={<LoadingFallback />}><Transfers /></Suspense>} />
            <Route path="/duplicates" element={<Suspense fallback={<LoadingFallback />}><Duplicates /></Suspense>} />
            <Route path="/snapshots" element={<Suspense fallback={<LoadingFallback />}><Snapshots /></Suspense>} />
            <Route path="/snapshots/:id" element={<Suspense fallback={<LoadingFallback />}><SnapshotDetails /></Suspense>} />
            <Route path="/import" element={<Suspense fallback={<LoadingFallback />}><BulkImport /></Suspense>} />
            <Route path="/audit" element={<Suspense fallback={<LoadingFallback />}><AuditLog /></Suspense>} />
            <Route path="/settings/types" element={<Suspense fallback={<LoadingFallback />}><PropertyTypeManager /></Suspense>} />
            <Route path="/settings/users" element={<Suspense fallback={<LoadingFallback />}><UserManagement /></Suspense>} />
            <Route path="/settings/geocoding" element={<Suspense fallback={<LoadingFallback />}><GeocodingManagement /></Suspense>} />
          </Route>
        </Route>
      </Routes>
    </Router>
  );
}

export default App;
