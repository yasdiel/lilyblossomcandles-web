export function Logo({ imageClassName = "h-24" }) {
  return (
    <a href="#inicio" className="flex items-center" aria-label="Lily Blossom Candles - Home">
      <img src="/logo.png" alt="Lily Blossom Candles" className={`${imageClassName} w-auto object-contain`} />
    </a>
  );
}

export default Logo;