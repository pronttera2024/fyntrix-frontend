import { handleSmoothScroll } from "../../lib/smooth-scroll";
import { GithubIcon, LinkedInIcon, XIcon } from "./icons";
import { FooterBlur } from "./footer-blur";
import { Link } from "react-router-dom";

const links = [
  {
    title: "Fyntrix",
    links: [
      {
        label: "Download App",
        href: "/base.apk",
        title: "Download the app from the App Store",
        download: "fyntrix.apk",
      },
      {
        label: "Features",
        href: "/#features",
        title: "See our features",
      },
    ],
  },
  {
    title: "Get Started",
    links: [
      {
        label: "Start Using Fyntrix",
        href: "https://fyntrix.ai/login",
        title: "Get started with Fyntrix",
      },
    ],
  },
  {
    title: "Company",
    links: [
      {
        label: "Terms & Conditions",
        href: "/terms",
        title: "Read our Terms & Conditions",
      },
    ],
  },
  {
    title: "Follow Us",
    links: [
      {
        label: (
          <div className="flex items-center gap-2">
            <XIcon fill="currentColor" className="h-4 w-4" />
            <span>Twitter</span>
          </div>
        ),
        href: "https://x.com/",
        title: "Follow us on Twitter",
      },
      {
        label: (
          <div className="flex items-center gap-2">
            <LinkedInIcon fill="currentColor" className="h-4 w-4" />
            <span>LinkedIn</span>
          </div>
        ),
        href: "https://www.linkedin.com/",
        title: "Connect with us on LinkedIn",
      },
      {
        label: (
          <div className="flex items-center gap-2">
            <GithubIcon fill="currentColor" className="h-4 w-4" />
            <span>Github</span>
          </div>
        ),
        href: "https://github.com/",
        title: "View our GitHub repository",
      },
    ],
  },
];

export function Footer() {
  return (
    <footer className="relative overflow-hidden py-6 border-t border-muted-foreground bg-primary">
      <FooterBlur />
      <div className="mx-auto grid w-full max-w-6xl grid-cols-2 gap-8 px-2 tracking-tight md:grid-cols-4">
        {links.map((link) => (
          <div key={link.title} className="text-center">
            <h3 className="text-muted-foreground text-lg mb-4">{link.title}</h3>
            <ul className="flex flex-col items-center gap-4">
              {link.links.map((link, index) => (
                <li key={index}>
                  {link.href.includes('#') ? (
                    <Link
                      to={link.href}
                      title={link.title}
                      onClick={(e) => handleSmoothScroll(e, link.href)}
                      className="text-white hover:text-blue-500 transition-colors"
                    >
                      {link.label}
                    </Link>
                  ) : (
                    <Link
                      to={link.href}
                      title={link.title}
                      target={link.href.startsWith("https://") ? "_blank" : undefined}
                      className="text-white hover:text-blue-500 transition-colors"
                    >
                      {link.label}
                    </Link>
                  )}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </footer>
  );
}
