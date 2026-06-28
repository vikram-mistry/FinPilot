import React from 'react';
import { Sun, Moon, WifiOff, LogOut, Settings as SettingsIcon } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useOffline } from '@/hooks/useOffline';
import { useAppStore } from '@/store/appStore';
import { cn } from '@/lib/cn';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '../ui/dropdown-menu';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Link } from 'react-router-dom';

export function TopBar() {
  const { user, signOut } = useAuth();
  const { isOnline } = useOffline();
  const { theme, setTheme, profile } = useAppStore();

  const toggleTheme = () => {
    if (theme === 'dark' || (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
      setTheme('light');
    } else {
      setTheme('dark');
    }
  };

  return (
    <header className="border-b border-border bg-card/50 backdrop-blur-md sticky top-0 z-30 pt-[env(safe-area-inset-top,0px)]">
      <div className="h-16 px-4 md:px-6 flex items-center justify-between">
        {/* Brand on Mobile / Page Heading on Desktop */}
        <div className="flex items-center gap-3">
          <div className="md:hidden flex items-center gap-2">
            <img src={`${import.meta.env.BASE_URL}favicon.svg`} alt="FinPilot Logo" className="w-8 h-8 object-contain" />
            <span className="font-bold text-base bg-gradient-to-r from-teal-500 to-blue-600 bg-clip-text text-transparent">
              FinPilot
            </span>
          </div>
          <h1 className="hidden md:block text-lg font-bold text-foreground">
            Personal Finance Dashboard
          </h1>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-3">
          {/* Offline Badge */}
          {!isOnline && (
            <Badge variant="outline" className="gap-1 border-expense-500/30 bg-expense-50 text-expense-600 dark:bg-expense-950/20 dark:text-expense-400 py-1 px-2.5 rounded-full text-xs font-semibold animate-pulse">
              <WifiOff className="w-3.5 h-3.5" />
              <span>Offline Mode</span>
            </Badge>
          )}

          {/* Theme Toggle */}
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleTheme}
            className="rounded-full w-10 h-10 border hover:bg-muted text-muted-foreground hover:text-foreground"
          >
            {theme === 'dark' ? <Sun className="w-4.5 h-4.5" /> : <Moon className="w-4.5 h-4.5" />}
          </Button>

          {/* User Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="relative h-10 w-10 rounded-full p-0 border border-border">
                <Avatar className="h-full w-full">
                  <AvatarImage src={user?.photoURL || ''} alt={user?.displayName || 'User'} />
                  <AvatarFallback className="bg-primary/10 text-primary font-semibold text-xs">
                    {(profile?.name || user?.displayName || 'FP').substring(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-56 mt-2" align="end" forceMount>
              <DropdownMenuLabel className="font-normal">
                <div className="flex flex-col space-y-1">
                  <p className="text-sm font-semibold leading-none">
                    {profile?.name || user?.displayName || 'Indian Salaried User'}
                  </p>
                  <p className="text-xs leading-none text-muted-foreground truncate">
                    {user?.email || 'user@finpilot.in'}
                  </p>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <Link to="/settings" className="cursor-pointer flex items-center w-full">
                  <SettingsIcon className="mr-2 h-4 w-4" />
                  <span>Settings</span>
                </Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={signOut} className="cursor-pointer text-expense-600 dark:text-expense-400 focus:bg-expense-50 dark:focus:bg-expense-950/20">
                <LogOut className="mr-2 h-4 w-4" />
                <span>Log Out</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
}
export default TopBar;
