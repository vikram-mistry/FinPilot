import React, { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { 
  LayoutDashboard, 
  CalendarDays, 
  Coins, 
  Percent, 
  ShieldAlert, 
  FileText, 
  TrendingUp, 
  Settings,
  ChevronLeft,
  ChevronRight,
  LogOut,
  Scale
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useAppStore } from '@/store/appStore';
import { cn } from '@/lib/cn';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import { Button } from '../ui/button';
import logo from '@/assets/logo.svg';

interface NavItem {
  name: string;
  path: string;
  icon: React.ComponentType<any>;
}

export function Sidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const { user, signOut } = useAuth();
  const profile = useAppStore((state) => state.profile);

  const items: NavItem[] = [
    { name: 'Dashboard', path: '/', icon: LayoutDashboard },
    { name: 'Monthly Planner', path: '/planner', icon: CalendarDays },
    { name: 'Investments', path: '/investments', icon: Coins },
    { name: 'Home Loan', path: '/loan', icon: Percent },
    { name: 'Emergency Fund', path: '/emergency', icon: ShieldAlert },
    { name: 'Scenario Simulator', path: '/simulator', icon: Scale },
    { name: 'Reports', path: '/reports', icon: FileText },
    { name: 'Net Worth', path: '/networth', icon: TrendingUp },
    { name: 'Settings', path: '/settings', icon: Settings },
  ];

  return (
    <aside
      className={cn(
        "hidden md:flex flex-col h-screen bg-card border-r border-border transition-all duration-300 relative z-20 shrink-0",
        collapsed ? "w-20" : "w-64"
      )}
    >
      {/* Brand Header */}
      <div className="flex items-center justify-between h-16 px-4 border-b border-border">
        {!collapsed && (
          <div className="flex items-center gap-2.5 pl-2">
            <img src={logo} alt="Logo" className="w-8 h-8 object-contain" />
            <span className="font-bold text-lg bg-gradient-to-r from-teal-500 to-blue-600 bg-clip-text text-transparent">
              FinPilot
            </span>
          </div>
        )}
        {collapsed && (
          <img src={logo} alt="Logo" className="mx-auto w-8 h-8 object-contain" />
        )}

        <button
          onClick={() => setCollapsed(!collapsed)}
          className="absolute -right-3.5 top-4.5 bg-card border border-border hover:bg-muted text-muted-foreground w-7 h-7 rounded-full flex items-center justify-center shadow-md transition-colors"
        >
          {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </button>
      </div>

      {/* Nav List */}
      <nav className="flex-1 px-3 py-4 space-y-1.5 overflow-y-auto">
        {items.map((item) => (
          <NavLink
            key={item.name}
            to={item.path}
            className={({ isActive }) =>
              cn(
                "flex items-center gap-3 px-3.5 py-2.5 rounded-2xl text-sm font-medium transition-all group",
                isActive
                  ? "bg-primary text-primary-foreground shadow-md shadow-primary/20"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              )
            }
          >
            <item.icon className="w-5 h-5 shrink-0" />
            {!collapsed && <span className="truncate">{item.name}</span>}
          </NavLink>
        ))}
      </nav>

      {/* User Footer Profile & Sign out */}
      <div className="p-4 border-t border-border space-y-3 bg-muted/40 dark:bg-muted/10">
        <div className={cn("flex items-center gap-3", collapsed && "justify-center")}>
          <Avatar className="w-10 h-10 border border-border">
            <AvatarImage src={user?.photoURL || ''} alt={user?.displayName || 'User'} />
            <AvatarFallback className="bg-primary/10 text-primary font-semibold">
              {(profile?.name || user?.displayName || 'FP').substring(0, 2).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          {!collapsed && (
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold truncate leading-tight">
                {profile?.name || user?.displayName || 'Indian Salaried User'}
              </p>
              <p className="text-xs text-muted-foreground truncate mt-0.5">
                {user?.email || 'user@finpilot.in'}
              </p>
            </div>
          )}
        </div>
        
        <Button
          onClick={signOut}
          variant="ghost"
          className={cn(
            "w-full flex items-center gap-3 text-muted-foreground hover:text-expense-600 hover:bg-expense-50 dark:hover:bg-expense-950/20 dark:hover:text-expense-400 py-2.5 rounded-2xl justify-start",
            collapsed && "justify-center px-0"
          )}
        >
          <LogOut className="w-5 h-5 shrink-0" />
          {!collapsed && <span>Sign Out</span>}
        </Button>
      </div>
    </aside>
  );
}
export default Sidebar;
