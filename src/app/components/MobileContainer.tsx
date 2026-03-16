import { ReactNode } from 'react';
import NetworkStatus from './NetworkStatus';
import wihdaBg from 'figma:asset/a5d87b68b83915f49c77ce9c95107f47b6de71d1.png';

interface MobileContainerProps {
  children: ReactNode;
  showBackground?: boolean;
}

export default function MobileContainer({ children, showBackground = false }: MobileContainerProps) {
  return (
    <div className="h-full w-full bg-gray-100 flex items-center justify-center">
      <div className="bg-white relative w-full max-w-[430px] h-full sm:h-[812px] overflow-hidden sm:shadow-2xl sm:rounded-[2.5rem] sm:border sm:border-gray-200/50">
        {/* Simulated notch area on desktop */}
        

        {showBackground && (
          <img
            src={wihdaBg}
            alt=""
            className="absolute inset-0 w-full h-full object-cover opacity-[0.35] pointer-events-none"
          />
        )}

        {/* Network status banner */}
        <NetworkStatus />

        <div className="relative h-full overflow-hidden">
          {children}
        </div>
      </div>
    </div>
  );
}