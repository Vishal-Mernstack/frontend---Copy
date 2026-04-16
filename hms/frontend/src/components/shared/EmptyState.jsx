import PropTypes from "prop-types";
import { Inbox } from "lucide-react";

/**
 * Empty state placeholder.
 */
export default function EmptyState({
  title = "No data",
  message = "Nothing to display yet.",
  description,
  children,
}) {
  const body = description || message;

  return (
    <div className="flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-slate-200 bg-white p-6 text-center">
      <Inbox className="h-8 w-8 text-slate-400" />
      <p className="text-sm font-semibold text-slate-900">{title}</p>
      <p className="text-xs text-slate-500">{body}</p>
      {children}
    </div>
  );
}

EmptyState.propTypes = {
  title: PropTypes.string,
  message: PropTypes.string,
  description: PropTypes.string,
  children: PropTypes.node,
};
