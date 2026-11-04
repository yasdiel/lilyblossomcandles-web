import { useEffect, useState } from "react";

export function IntroSplash() {
  const [visible, setVisible] = useState(
    () => !window.matchMedia("(prefers-reduced-motion: reduce)").matches,
  );

  useEffect(() => {
    if (!visible) return undefined;

    const timeout = window.setTimeout(() => setVisible(false), 2000);
    return () => window.clearTimeout(timeout);
  }, [visible]);

  if (!visible) return null;

  return (
    <>
      <style>{`
        .intro-splash {
          position: fixed;
          inset: 0;
          z-index: 50;
          background: var(--bone);
        }
        .intro-splash img {
          position: absolute;
          top: 50%;
          left: 50%;
          width: auto;
          max-width: 80vw;
          height: min(65vh, 360px);
          object-fit: contain;
          transform: translate(-50%, -50%);
          animation: intro-logo-arrival 2s cubic-bezier(0.65, 0, 0.35, 1) forwards;
        }
        @keyframes intro-logo-arrival {
          0%, 60% {
            height: min(65vh, 360px);
            transform: translate(-50%, -50%);
          }
          100% {
            height: 110px;
            transform: translate(-50%, calc(-50vh + 55px));
          }
        }
        @media (prefers-reduced-motion: reduce) {
          .intro-splash img {
            animation: none;
          }
        }
      `}</style>
      <div className="intro-splash" aria-hidden="true">
        <img src="/logo.png" alt="" />
      </div>
    </>
  );
}

export default IntroSplash;
