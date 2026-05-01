type SupernovaFooterProps = {
  className?: string;
};

export default function SupernovaFooter({ className = "" }: SupernovaFooterProps) {
  return (
    <footer
      className={`border-t border-white/10 mt-32 pt-16 flex flex-col items-center gap-4 text-center ${className}`}
    >
      <div className="flex flex-col items-center gap-2">
        <div className="text-base font-bold tracking-[0.25em] text-white uppercase">
          SUPERNOVA
        </div>
        <div className="text-xs font-medium text-[#C9EB55] tracking-[0.2em]">
          SNOVAPOOL IO
        </div>
      </div>
      <div className="text-xs text-gray-600 mt-2">
        © 2026 SUPERNOVA All rights reserved
      </div>
    </footer>
  );
}
