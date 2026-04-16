import PropTypes from "prop-types";
import { Link } from "react-router-dom";
import { Button } from "../components/ui/button";
import { useAuth } from "../context/AuthContext";
import { HOME_BY_ROLE } from "../utils/roles";

/**
 * Not Found page.
 */
export default function NotFound({ title = "Page not found" }) {
  const { user } = useAuth();
  const homePath = HOME_BY_ROLE[user?.role] || "/";

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-slate-50 p-6 text-center">
      <h1 className="text-3xl font-semibold text-slate-900">{title}</h1>
      <p className="text-sm text-slate-500">The page you are looking for does not exist.</p>
      <Button asChild>
        <Link to={homePath}>Back to Dashboard</Link>
      </Button>
    </div>
  );
}

NotFound.propTypes = {
  title: PropTypes.string,
};
