import { BrowserRouter, Routes, Route } from "react-router-dom";
import AuthPage from "./pages/AuthPage";
import AuthCallbackPage from "./pages/AuthCallbackPage";
import CockpitsPage from "./pages/CockpitsPage";
import CreateCockpitPage from "./pages/CreateCockpitPage";
import SchoolsPage from "./pages/SchoolsPage";
import CreateSchoolPage from "./pages/CreateSchoolPage";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/auth/callback" element={<AuthCallbackPage />} />
        <Route path="/auth" element={<AuthPage />} />
        <Route path="/cockpits" element={<CockpitsPage />} />
        <Route path="/cockpits/create" element={<CreateCockpitPage />} />
        <Route path="/schools" element={<SchoolsPage />} />
        <Route path="/schools/create" element={<CreateSchoolPage />} />
        <Route path="*" element={<AuthPage />} />
      </Routes>
    </BrowserRouter>
  );
}