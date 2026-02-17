import { siInstagram, siLine, siFacebook } from "simple-icons";

type SimpleIconProps = {
  icon: typeof siInstagram | typeof siLine | typeof siFacebook;
  className?: string;
  size?: number;
};

export function SimpleIcon({ icon, className = "", size = 20 }: SimpleIconProps) {
  return (
    <svg
      role="img"
      viewBox="0 0 24 24"
      className={className}
      width={size}
      height={size}
      fill="currentColor"
      xmlns="http://www.w3.org/2000/svg"
    >
      <title>{icon.title}</title>
      <path d={icon.path} />
    </svg>
  );
}
