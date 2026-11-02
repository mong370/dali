import { Link } from 'react-router-dom';
import logo from '../assets/logo.png';
import { SmartImage } from './SmartImage';

export function Logo({ className = 'h-12' }: { className?: string }) {
  return (
    <Link to="/" aria-label="Dali home" className="flex shrink-0">
      <SmartImage src={logo} alt="Dali" fit="contain" tone="none" className={`${className} aspect-[366/160] w-auto`} />
    </Link>
  );
}
