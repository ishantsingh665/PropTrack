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
            <Route element={<Suspense fallback={<LoadingFallback />}>}>
              <Route path="/" element={<Dashboard />} />
              <Route path="/companies" element={<Companies />} />
              <Route path="/companies/:id" element={<CompanyDetails />} />
              <Route path="/properties" element={<Properties />} />
              <Route path="/properties/:id" element={<PropertyDetails />} />
              <Route path="/transfers" element={<Transfers />} />
              <Route path="/duplicates" element={<Duplicates />} />
              <Route path="/import" element={<BulkImport />} />
              <Route path="/audit" element={<AuditLog />} />
              <Route path="/settings/types" element={<PropertyTypeManager />} />
              <Route path="/settings/users" element={<UserManagement />} />
              <Route path="/settings/geocoding" element={<GeocodingManagement />} />
            </Route>
          </Route>
        </Route>
      </Routes>
    </Router>
  );
}

export default App;
