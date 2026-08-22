import { useEffect, useState } from 'react';
import { ArrowDown, ArrowUp } from 'lucide-react';

export function ScrollNavigation() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    const onScroll = () => setShow(window.scrollY > 240);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const scrollTop = () => window.scrollTo({ top: 0, behavior: 'smooth' });
  const scrollBottom = () => window.scrollTo({ top: document.documentElement.scrollHeight, behavior: 'smooth' });

  return (
    <div className={`fixed right-3 sm:right-5 bottom-4 sm:bottom-6 z-[60] flex flex-col gap-2 transition-all duration-300 ${show ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-3 pointer-events-none'}`}>
      <button
        type="button"
        onClick={scrollTop}
        aria-label="Lên đầu trang"
        title="Lên đầu trang"
        className="w-11 h-11 sm:w-12 sm:h-12 rounded-full bg-emerald-700 text-white shadow-lg shadow-emerald-900/25 hover:bg-emerald-800 active:scale-95 transition-all flex items-center justify-center border border-white/20"
      >
        <ArrowUp className="w-5 h-5" />
      </button>
      <button
        type="button"
        onClick={scrollBottom}
        aria-label="Xuống cuối trang"
        title="Xuống cuối trang"
        className="w-11 h-11 sm:w-12 sm:h-12 rounded-full bg-slate-800 text-white shadow-lg shadow-slate-900/25 hover:bg-slate-900 active:scale-95 transition-all flex items-center justify-center border border-white/20"
      >
        <ArrowDown className="w-5 h-5" />
      </button>
    </div>
  );
}
