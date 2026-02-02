export function handleSmoothScroll(e: React.MouseEvent, href: string) {
  e.preventDefault();
  
  if (href.startsWith('#')) {
    const element = document.querySelector(href);
    if (element) {
      element.scrollIntoView({
        behavior: 'smooth',
        block: 'start'
      });
    }
  }
}
