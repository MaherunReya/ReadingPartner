import { Link, useLocation } from "react-router-dom";
import Logo from "./Logo";

// Logo + "Study Guide" title that always takes you to the homepage.
// If you're already on the homepage it scrolls back to the top instead.
export default function LogoLink({ className = "" }) {
  const { pathname } = useLocation();
  return (
    <Link
      to="/"
      aria-label="Study Guide home"
      onClick={() => {
        if (pathname === "/") window.scrollTo({ top: 0, behavior: "smooth" });
      }}
      className={`inline-block ${className}`}
    >
      <Logo />
    </Link>
  );
}