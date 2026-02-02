import { MobileNav } from "./mobile-nav";
import { DesktopNav } from "./desktop-nav";

const navItems = [
  {
    label: "Home",
    href: "/",
  },
  {
    label: "Features",
    href: "/#features",
  },
  {
    label: "Legal",
    href: "/terms",
  },
];

export function Nav() {
  return (
    <>
      <MobileNav className="flex md:hidden" items={navItems} />
      <DesktopNav className="hidden md:flex" items={navItems} />
    </>
  );
}
