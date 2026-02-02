import { Drawer, DrawerContent, DrawerTrigger, DrawerTitle } from "../ui/drawer";
import { Button } from "../ui/button";
import { cn } from "../../lib/utils";
import { handleSmoothScroll } from "../../lib/smooth-scroll";
import { Menu } from "lucide-react";
import { Link } from "react-router-dom";

type Props = {
  items: {
    label: string;
    href: string;
  }[];
  className?: string;
};

export function MobileNav({ items, className }: Props) {
  return (
    <nav className={cn("flex w-full max-w-7xl items-center justify-between gap-4", className)}>
      <Link to="/">
        <img src="/logo.svg" alt="logo" width={140} height={48} />
      </Link>
      <Drawer direction="top">
        <DrawerTrigger className="relative -m-2 cursor-pointer p-2">
          <span className="sr-only">Open menu</span>
          <Menu className="h-6 w-6" />
        </DrawerTrigger>
        <DrawerContent className="flex flex-col gap-4 p-8">
          <DrawerTitle className="sr-only">Menu</DrawerTitle>
          {items.map((item) => (
            item.href.includes('#') ? (
              <Link 
                key={item.href} 
                to={item.href}
                onClick={(e) => handleSmoothScroll(e, item.href)}
                className="text-lg font-medium hover:text-blue-600 transition-colors"
              >
                {item.label}
              </Link>
            ) : (
              <Link key={item.href} to={item.href} className="text-lg font-medium hover:text-blue-600 transition-colors">
                {item.label}
              </Link>
            )
          ))}
          <div className="flex gap-4">
            <Button className="flex-1">
              <a href="https://fyntrix.ai/login" target="_blank" rel="noopener noreferrer">Get Started</a>
            </Button>
            <Button className="flex-1">
              <Link to="#">Download App</Link>
            </Button>
          </div>
        </DrawerContent>
      </Drawer>
    </nav>
  );
}
