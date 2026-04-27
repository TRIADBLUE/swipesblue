const SWIPESBLUE_LOCKUP = "https://cdn.triadblue.com/brands/swipesblue/logo-image-and-logo-text-as-url.png";

interface LogoProps {
  className?: string;
}

export default function Logo({ className = "" }: LogoProps) {
  return (
    <div className={`flex items-center ${className}`} data-testid="logo-container">
      <img
        src={SWIPESBLUE_LOCKUP}
        alt="swipesblue.com"
        className="h-[39px] w-auto"
        data-testid="img-logo"
      />
    </div>
  );
}
