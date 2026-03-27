import { BrowserRouter, Routes, Route } from "react-router-dom";
import AuthPage from "./pages/AuthPage";
import AuthCallbackPage from "./pages/AuthCallbackPage";
import CockpitsPage from "./pages/CockpitsPage";
import CreateCockpitPage from "./pages/CreateCockpitPage";
import SchoolsPage from "./pages/SchoolsPage";
import CreateSchoolPage from "./pages/CreateSchoolPage";
import SettingsPage from "./pages/SettingsPage";
import AppLayout from "./pages/AppLayout";
import StudyCockpitPage from "./pages/StudyCockpitPage";
import ContentLayout from "./pages/ContentLayout";
import Cockpits from "./pages/Cockpits";
import CreateCockpit from "./pages/CreateCockpit";
import StudyCockpit from "./pages/StudyCockpit";
import ChecklistCockpit from "./pages/ChecklistCockpit";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/auth/callback" element={<AuthCallbackPage />} />
        <Route path="/auth" element={<AuthPage />} />
        <Route element={<AppLayout />}>
          <Route path="/cockpits" element={<CockpitsPage />} />
          <Route path="/schools" element={<SchoolsPage />} />
          <Route path="/settings" element={<SettingsPage />} />
        </Route>
        <Route path="/cockpits/:id/learn" element={<StudyCockpitPage />} />
        <Route path="/cockpits/create" element={<CreateCockpitPage />} />
        <Route path="/schools/create" element={<CreateSchoolPage />} />
        {/* <Route path="/tests" element={<ContentLayout title={"Cockpits"} />} />
        <Route path="/new/cockpits" element={<Cockpits />} /> */}

        <Route element={<ContentLayout />}>
          <Route path="/new/cockpits" element={<Cockpits />} />
        </Route>
        <Route path="/new/cockpits/create" element={<CreateCockpit />} />
        <Route path="/new/cockpits/:id/learn" element={<StudyCockpit />} />
        <Route path="/new/cockpits/:id/checklist" element={<ChecklistCockpit />} />






        <Route path="*" element={<AuthPage />} />
      </Routes>
    </BrowserRouter>
  );
}