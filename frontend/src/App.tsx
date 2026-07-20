import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import Companies from './pages/Companies';
import CompanyDetails from './pages/CompanyDetails';
import Properties from './pages/Properties';
import PropertyDetails from './pages/PropertyDetails';
import Transfers from './pages/Transfers';
import Duplicates from './pages/Duplicates';
import BulkImport from './pages/BulkImport';
import AuditLog from './pages/AuditLog';
import PropertyTypeManager from './pages/PropertyTypeManager';
import UserManagement from './pages/UserManagement';
import GeocodingManagement from './pages/GeocodingManagement';
import ProtectedRoute from './components/ProtectedRoute';
import Layout from './components/Layout';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        
        <Route element={<ProtectedRoute />}>
          <Route element={<Layout />}>
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
      </Routes>
    </Router>
  );
}

export default App;
