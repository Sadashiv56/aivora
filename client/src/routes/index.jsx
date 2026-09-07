import { Navigate, Route, Routes } from "react-router-dom";
import { FullPageLoader } from "../components/common/Spinner";
import { useAuth } from "../context/AuthContext";
import LoginPage from "../pages/LoginPage";
import RegisterPage from "../pages/RegisterPage";
import { ChatLayout } from "../pages/ChatLayout";
import { NewChat } from "../pages/NewChat";
import { CreateGroup } from "../pages/CreateGroup";
import { GroupInfo } from "../pages/GroupInfo";
import { ProfilePage } from "../pages/ProfilePage";
import { SettingsPage } from "../pages/SettingsPage";
import { UserProfilePage } from "../pages/UserProfilePage";
import { SearchMessagesPage } from "../pages/SearchMessagesPage";
import NotFound from "../pages/NotFound";

const Protected = ({ children }) => {
  const { user, loading } = useAuth();
  if (loading) return <FullPageLoader />;
  if (!user) return <Navigate to="/login" replace />;
  return children;
};

const Guest = ({ children }) => {
  const { user, loading } = useAuth();
  if (loading) return <FullPageLoader />;
  if (user) return <Navigate to="/" replace />;
  return children;
};

const AppRoutes = () => (
  <Routes>
    <Route path="/login" element={<Guest><LoginPage /></Guest>} />
    <Route path="/register" element={<Guest><RegisterPage /></Guest>} />
    <Route
      path="/"
      element={
        <Protected>
          <ChatLayout />
        </Protected>
      }
    />
    <Route path="/new-chat" element={<Protected><NewChat /></Protected>} />
    <Route path="/create-group" element={<Protected><CreateGroup /></Protected>} />
    <Route path="/group/:id" element={<Protected><GroupInfo /></Protected>} />
    <Route path="/user/:id" element={<Protected><UserProfilePage /></Protected>} />
    <Route path="/profile" element={<Protected><ProfilePage /></Protected>} />
    <Route path="/settings" element={<Protected><SettingsPage /></Protected>} />
    <Route path="/search" element={<Protected><SearchMessagesPage /></Protected>} />
    <Route path="*" element={<NotFound />} />
  </Routes>
);

export default AppRoutes;