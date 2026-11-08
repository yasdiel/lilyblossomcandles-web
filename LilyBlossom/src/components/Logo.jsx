export function Logo({ imageClassName = "h-[110px]", imageSrc = "/logo.png" }) {
  return (
    <a href="#inicio" className="flex items-center" aria-label="Lily Blossom Candles - Home">
      <img src={imageSrc} alt="Lily Blossom Candles" className={`${imageClassName} w-auto object-contain`} />
    </a>
  );
}

export default Logo;