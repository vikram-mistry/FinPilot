import React, { useState, useRef } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { 
  LayoutDashboard, 
  CalendarDays, 
  Percent, 
  FileText, 
  Settings, 
  Menu, 
  Coins, 
  ShieldAlert, 
  TrendingUp,
  X,
  Scale
} from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { cn } from '@/lib/cn';

interface NavItem {
  name: string;
  path: string;
  icon: React.ComponentType<any>;
}

export function BottomNav() {
  const [showMore, setShowMore] = useState(false);
  const closingRef = useRef(false);
  const navigate = useNavigate();

  React.useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 768) {
        setShowMore(false);
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const openMore = () => {
    if (!closingRef.current) {
      setShowMore(true);
    }
  };

  const closeMore = () => {
    setShowMore(false);
    closingRef.current = true;
    setTimeout(() => {
      closingRef.current = false;
    }, 400);
  };

  const handleMoreNavigation = (path: string) => {
    closeMore();
    // Small delay to let the sheet start closing before navigation
    setTimeout(() => {
      navigate(path);
    }, 50);
  };

  const primaryItems: NavItem[] = [
    { name: 'Dashboard', path: '/', icon: LayoutDashboard },
    { name: 'Planner', path: '/planner', icon: CalendarDays },
    { name: 'Home Loan', path: '/loan', icon: Percent },
    { name: 'Reports', path: '/reports', icon: FileText },
  ];

  const moreItems: NavItem[] = [
    { name: 'Investments', path: '/investments', icon: Coins },
    { name: 'Emergency', path: '/emergency', icon: ShieldAlert },
    { name: 'Simulator', path: '/simulator', icon: Scale },
    { name: 'Net Worth', path: '/networth', icon: TrendingUp },
    { name: 'Settings', path: '/settings', icon: Settings },
  ];

  return (
    <div className="md:hidden">
      {/* Primary Navigation Row */}
      <div className="fixed bottom-0 left-0 right-0 z-40 bg-background border-t border-border safe-bottom">
        <div className="flex justify-around items-center h-16 px-2">
          {primaryItems.map((item) => (
            <NavLink
              key={item.name}
              to={item.path}
              className={({ isActive }) =>
                cn(
                  "flex flex-col items-center justify-center flex-1 py-1 text-xs font-medium transition-colors text-muted-foreground",
                  isActive && "text-primary"
                )
              }
            >
              {({ isActive }) => (
                <>
                  <motion.div
                    whileTap={{ scale: 0.9 }}
                    className={cn(
                      "p-1 rounded-xl transition-all",
                      isActive && "bg-primary/10 text-primary"
                    )}
                  >
                    <item.icon className="w-5.5 h-5.5" />
                  </motion.div>
                  <span className="text-[10px] mt-0.5">{item.name}</span>
                </>
              )}
            </NavLink>
          ))}

          {/* More Tab Trigger */}
          <button
            onClick={openMore}
            className={cn(
              "flex flex-col items-center justify-center flex-1 py-1 text-xs font-medium text-muted-foreground",
              showMore && "text-primary"
            )}
          >
            <motion.div
              whileTap={{ scale: 0.9 }}
              className={cn("p-1 rounded-xl transition-all", showMore && "bg-primary/10")}
            >
              <Menu className="w-5.5 h-5.5" />
            </motion.div>
            <span className="text-[10px] mt-0.5">More</span>
          </button>
        </div>
      </div>

      {/* "More" Sheet Overlay */}
      <AnimatePresence>
        {showMore && (
          <>
            <motion.div
              key="more-backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.5 }}
              exit={{ opacity: 0 }}
              onClick={closeMore}
              className="fixed inset-0 bg-black/60 z-50 cursor-pointer"
              aria-label="Close menu"
              role="button"
            />
            <motion.div
              key="more-sheet"
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 250 }}
              className="fixed bottom-0 left-0 right-0 z-[55] bg-card rounded-t-3xl border-t border-border p-6 shadow-2xl safe-bottom"
            >
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-lg font-semibold px-1">More Features</h3>
                <button
                  onClick={closeMore}
                  className="p-2.5 hover:bg-muted rounded-full transition-colors cursor-pointer min-w-[44px] min-h-[44px] flex items-center justify-center"
                  aria-label="Close"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="grid grid-cols-4 gap-y-6 gap-x-2 pb-4">
                {moreItems.map((item) => (
                  <button
                    key={item.name}
                    onClick={() => handleMoreNavigation(item.path)}
                    className="flex flex-col items-center justify-center text-center p-2 rounded-2xl transition-all text-muted-foreground hover:bg-muted cursor-pointer"
                  >
                    <div className="w-12 h-12 flex items-center justify-center rounded-2xl border border-border bg-card shadow-sm mb-2 transition-all">
                      <item.icon className="w-5.5 h-5.5" />
                    </div>
                    <span className="text-[11px] font-medium leading-tight">{item.name}</span>
                  </button>
                ))}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
export default BottomNav;

