import { BrowserRouter, Routes, Route } from "react-router-dom";
import AuthPage from "./pages/AuthPage";
import AuthCallbackPage from "./pages/AuthCallbackPage";
import SchoolsPage from "./pages/SchoolsPage";
import CreateSchoolPage from "./pages/CreateSchoolPage";
import SettingsPage from "./pages/SettingsPage";
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

        <Route element={<ContentLayout />}>
          <Route path="/cockpits" element={<Cockpits />} />
          <Route path="/schools" element={<SchoolsPage />} />
          <Route path="/settings" element={<SettingsPage />} />
        </Route>

        <Route path="/cockpits/create" element={<CreateCockpit />} />
        <Route path="/cockpits/:id/learn" element={<StudyCockpit />} />
        <Route path="/cockpits/:cockpitId/checklist/:checklistId" element={<ChecklistCockpit />} />
        <Route path="/schools/create" element={<CreateSchoolPage />} />

        <Route path="*" element={<AuthPage />} />
      </Routes>
    </BrowserRouter>
  );
}