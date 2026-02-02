import { Button } from "../ui/button";
import {
  NavigationMenu,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
} from "../ui/navigation-menu";
import { cn } from "../../lib/utils";
import { handleSmoothScroll } from "../../lib/smooth-scroll";
import { Link } from "react-router-dom";

type Props = {
  items: {
    label: string;
    href: string;
  }[];
  className?: string;
};

export function DesktopNav({ items, className }: Props) {
  return (
    <nav className={cn("mx-auto flex w-full max-w-7xl items-center justify-between gap-4", className)}>
      <Link to="/">
        <img src="/logo.svg" alt="logo" width={180} height={48} />
      </Link>
      <NavigationMenu>
        <NavigationMenuList className="gap-8">
          {items.map((item) => (
            <NavigationMenuItem key={item.href}>
              {item.href.includes('#') ? (
                <NavigationMenuLink 
                  className="text-xl cursor-pointer" 
                  onClick={(e) => handleSmoothScroll(e, item.href)}
                >
                  {item.label}
                </NavigationMenuLink>
              ) : (
                <NavigationMenuLink asChild className="text-xl" href={item.href}>
                  <Link to={item.href}>{item.label}</Link>
                </NavigationMenuLink>
              )}
            </NavigationMenuItem>
          ))}
        </NavigationMenuList>
      </NavigationMenu>
      <div className="flex gap-4">
        <Button asChild className='text-base'>
          <a href="https://fyntrix.ai/login" target="_blank" rel="noopener noreferrer">Get Started</a>
        </Button>
        <Button asChild className='text-base'>
          <Link to="#">Download App</Link>
        </Button>
      </div>
    </nav>
  );
}
