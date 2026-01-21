import { useEffect, useState } from "react";
import SplashScreen from '../../assets/splash-screen.png';
import BackgroundMusic from '../../assets/bg-music.mp3';

export default function TemporaryOverlay() {
  const [visible, setVisible] = useState(true);
  const [fadeIn, setFadeIn] = useState(false);

  useEffect(() => {
    // Fade in image after 1 second
    const fadeTimer = setTimeout(() => setFadeIn(true), 1000);

    // Hide overlay completely after 3 seconds
    const hideTimer = setTimeout(() => setVisible(false), 5000);

    // Play background music once per user
    const hasPlayed = localStorage.getItem("splashMusicPlayed");
    if (!hasPlayed) {
      const audio = new Audio(BackgroundMusic);
      audio.volume = 1.0;

      // Try to play immediately
      audio.play().then(() => {
        localStorage.setItem("splashMusicPlayed", "true");
      }).catch(() => {
        // Autoplay blocked: play on first user interaction
        const handleUserInteraction = () => {
          audio.play().catch(err => console.log(err));
          localStorage.setItem("splashMusicPlayed", "true");
          window.removeEventListener("click", handleUserInteraction);
          window.removeEventListener("touchstart", handleUserInteraction);
        };
        window.addEventListener("click", handleUserInteraction);
        window.addEventListener("touchstart", handleUserInteraction);
      });
    }

    return () => {
      clearTimeout(fadeTimer);
      clearTimeout(hideTimer);
    };
  }, []);


  if (!visible) return null;

  return (
    <div
    className="flex md:hidden"
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        width: "100vw",
        height: "100vh",
        background: "black",
        zIndex: 9999,
        justifyContent: "center",
        alignItems: "center",
        cursor: "pointer" // hints user can click if autoplay blocked
      }}
    >
      <img
        src={SplashScreen}
        alt="Splash Screen"
        style={{
          width: "100%",
          height: "100%",
          objectFit: "cover",
          opacity: fadeIn ? 1 : 0,
          transition: "opacity 1s ease-in",
        }}
      />
    </div>
  );
}
