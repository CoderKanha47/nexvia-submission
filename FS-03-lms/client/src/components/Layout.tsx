import { useState, useEffect, useRef, useCallback } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useAppSelector, useAppDispatch } from '../app/hooks';
import { clearCredentials } from '../features/auth/authSlice';
import { 
  ChevronDown as ChevronDownIcon, 
  LogOut as LogOutIcon,
  LayoutDashboard as LayoutDashboardIcon,
  BookOpen as BookOpenIcon2,
  Award as AwardIcon,
  Users as UsersIcon,
  BookOpenText as BookOpenTextIcon,
  DollarSign as DollarSignIcon,
  Settings as SettingsIcon,
  Shield as ShieldIcon,
  Users2 as Users2Icon,
  GraduationCap as GraduationCapIcon,
  ShieldCheck,
} from 'lucide-react';
import { getRoleLabel, getRoleColors } from '../lib/roles';
import type { UserRole } from '../lib/roles';

const Logo = () => (
  <svg className="w-8 h-8" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
    <rect width="32" height="32" rx="8" fill="url(#grad)" />
    <path d="M10 16L14 20L22 12" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
    <defs>
      <linearGradient id="grad" x1="0" y1="0" x2="32" y2="32" gradientUnits="userSpaceOnUse">
        <stop offset="0%" stopColor="#6366F1" />
        <stop offset="100%" stopColor="#8B5CF6" />
      </linearGradient>
    </defs>
  </svg>
);

const FooterLogo = () => (
  <svg className="w-8 h-8" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
    <rect width="32" height="32" rx="8" fill="url(#gradFooter)" />
    <path d="M10 16L14 20L22 12" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
    <defs>
      <linearGradient id="gradFooter" x1="0" y1="0" x2="32" y2="32" gradientUnits="userSpaceOnUse">
        <stop offset="0%" stopColor="#6366F1" />
        <stop offset="100%" stopColor="#8B5CF6" />
      </linearGradient>
    </defs>
  </svg>
);

const MobileMenu = ({ isOpen, onClose, isAuthenticated, user, onLogout }: {
  isOpen: boolean;
  onClose: () => void;
  isAuthenticated: boolean;
  user: { name: string; role: string } | null;
  onLogout: () => void;
}) => {
  if (!isOpen) return null;

  const handleLogoutAndClose = () => {
    onLogout();
    onClose();
  };

  return (
    <div id="mobile-menu" className="lg:hidden fixed inset-0 z-50 bg-white pt-16 pb-6" role="dialog" aria-modal="true" aria-labelledby="mobile-menu-title">
      <div className="max-w-sm mx-auto">
        <h2 id="mobile-menu-title" className="sr-only">Mobile Menu</h2>
        <div className="space-y-2 pt-4 pb-6 border-t border-gray-100">
          <NavLink to="/courses" className="block px-4 py-3 rounded-lg text-base font-medium text-gray-600 hover:text-indigo-600 hover:bg-gray-50" onClick={onClose}>Courses</NavLink>
          <NavLink to="/courses?category=Live" className="block px-4 py-3 rounded-lg text-base font-medium text-gray-600 hover:text-indigo-600 hover:bg-gray-50" onClick={onClose}>Live Classes</NavLink>
          {isAuthenticated ? (
            <>
              <NavLink to="/my-learning" className="block px-4 py-3 rounded-lg text-base font-medium text-gray-600 hover:text-indigo-600 hover:bg-gray-50" onClick={onClose}>My Learning</NavLink>
              {(user?.role === 'instructor' || user?.role === 'admin') && (
                <NavLink to="/instructor" className="block px-4 py-3 rounded-lg text-base font-medium text-gray-600 hover:text-indigo-600 hover:bg-gray-50" onClick={onClose}>Instructor Dashboard</NavLink>
              )}
              {user?.role === 'admin' && (
                <NavLink to="/admin" className="block px-4 py-3 rounded-lg text-base font-medium text-gray-600 hover:text-indigo-600 hover:bg-gray-50" onClick={onClose}>Admin Panel</NavLink>
              )}
              <NavLink to="/certificates" className="block px-4 py-3 rounded-lg text-base font-medium text-gray-600 hover:text-indigo-600 hover:bg-gray-50" onClick={onClose}>My Certificates</NavLink>
              <button onClick={handleLogoutAndClose} className="w-full text-left px-4 py-3 rounded-lg text-base font-medium text-red-600 hover:bg-gray-50">Logout</button>
            </>
          ) : (
            <>
              <NavLink to="/login" className="block px-4 py-3 rounded-lg text-base font-medium text-gray-600 hover:text-indigo-600 hover:bg-gray-50" onClick={onClose}>Login</NavLink>
              <NavLink to="/register" className="block px-4 py-3 rounded-lg text-base font-medium text-white bg-indigo-600 hover:bg-indigo-700" onClick={onClose}>Register</NavLink>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

const Header = ({ scrolled, mobileMenuOpen, setMobileMenuOpen, searchQuery, setSearchQuery, handleSearch, isAuthenticated, user, onLogout, userMenuOpen, onUserMenuToggle, onUserMenuClose }: {
  scrolled: boolean;
  mobileMenuOpen: boolean;
  setMobileMenuOpen: (open: boolean) => void;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  handleSearch: (e: React.FormEvent) => void;
  isAuthenticated: boolean;
  user: { name: string; email: string; role: string } | null;
  onLogout: () => void;
  userMenuOpen: boolean;
  onUserMenuToggle: () => void;
  onUserMenuClose: () => void;
}) => {
  const menuRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const role = (user?.role as UserRole) ?? 'student';
  const roleLabel = getRoleLabel(role);
  const roleColors = getRoleColors(role);

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        onUserMenuClose();
        setMobileMenuOpen(false);
      }
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onUserMenuClose, setMobileMenuOpen]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onUserMenuClose();
      }
    }
    if (userMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [userMenuOpen, onUserMenuClose]);

  const handleMenuKeyDown = useCallback((e: React.KeyboardEvent, _items: Array<{ label: string; href: string; icon: string }>, index: number) => {
    const menuItems = menuRef.current?.querySelectorAll('[role="menuitem"]');
    if (!menuItems || menuItems.length === 0) return;

    let newIndex: number;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      newIndex = (index + 1) % menuItems.length;
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      newIndex = (index - 1 + menuItems.length) % menuItems.length;
    } else if (e.key === 'Home') {
      e.preventDefault();
      newIndex = 0;
    } else if (e.key === 'End') {
      e.preventDefault();
      newIndex = menuItems.length - 1;
    } else if (e.key === 'Escape') {
      onUserMenuClose();
      buttonRef.current?.focus();
      return;
    } else {
      return;
    }

    (menuItems[newIndex] as HTMLElement)?.focus();
  }, [onUserMenuClose]);

  const getMenuItems = () => {
    if (!isAuthenticated || !user) return { primary: [], account: [] };

    const role = user.role as UserRole;
    const primaryItems: Array<{ label: string; href: string; icon: string; roles?: UserRole[] }> = [];
    const accountItems: Array<{ label: string; href: string; icon: string; roles?: UserRole[] }> = [];

    // Primary items (role-aware)
    if (role === 'student') {
      primaryItems.push(
        { label: 'My Learning', href: '/my-learning', icon: 'LayoutDashboard', roles: ['student'] },
        { label: 'My Certificates', href: '/certificates', icon: 'Award', roles: ['student'] },
      );
    }
    if (role === 'instructor' || role === 'admin') {
      primaryItems.push(
        { label: 'Instructor Dashboard', href: '/instructor/dashboard', icon: 'LayoutDashboard', roles: ['instructor', 'admin'] },
        { label: 'My Courses', href: '/instructor/courses', icon: 'BookOpen', roles: ['instructor', 'admin'] },
        { label: 'Earnings', href: '/instructor/earnings', icon: 'DollarSign', roles: ['instructor', 'admin'] },
      );
    }
    if (role === 'admin') {
      primaryItems.push(
        { label: 'Admin Panel', href: '/admin', icon: 'Shield', roles: ['admin'] },
        { label: 'Manage Users', href: '/admin/users', icon: 'Users', roles: ['admin'] },
        { label: 'Manage Courses', href: '/admin/courses', icon: 'BookOpen', roles: ['admin'] },
      );
    }

    // Account section (all roles)
    accountItems.push(
      { label: 'Profile & Settings', href: '/settings', icon: 'Settings', roles: ['student', 'instructor', 'admin'] },
    );

    const filterByRole = (items: Array<{ label: string; href: string; icon: string; roles?: UserRole[] }>) =>
      items.filter(item => !item.roles || item.roles.includes(role));

    return {
      primary: filterByRole(primaryItems),
      account: filterByRole(accountItems),
    };
  };

  const { primary: primaryItems, account: accountItems } = getMenuItems();
  const allMenuItems = [...primaryItems, ...accountItems, { label: 'Logout', href: '', icon: 'LogOut', isLogout: true }];

  return (
  <header className={`sticky top-0 z-50 transition-all duration-300 ${scrolled ? 'bg-white/90 backdrop-blur-lg shadow-md shadow-gray-200/50 border-b border-gray-200' : 'bg-white border-b border-gray-200'}`} role="banner">
    <nav className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8" aria-label="Main navigation">
      <div className="flex items-center justify-between h-16 lg:h-16">
        <div className="flex items-center gap-4 lg:gap-8">
          <NavLink to="/" className="text-xl font-bold text-indigo-600 flex items-center gap-2" aria-label="LearnNEXT Home">
            <Logo />
            <span>LearnNEXT</span>
          </NavLink>

          <div className="hidden lg:flex lg:items-center lg:gap-6 flex-1 max-w-xl mx-8">
            <form onSubmit={handleSearch} className="relative w-full max-w-md" role="search">
              <label htmlFor="header-search" className="sr-only">Search courses</label>
              <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
              <input id="header-search" type="search" placeholder="Search courses..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all" />
            </form>
          </div>

          <div className="hidden lg:flex lg:items-center lg:gap-4">
            <NavLink to="/courses" className={({ isActive }) => `px-3 py-2 rounded-lg text-sm font-medium transition-colors ${isActive ? 'text-indigo-600 bg-indigo-50' : 'text-gray-600 hover:text-indigo-600 hover:bg-gray-50'}`}>Courses</NavLink>
            <NavLink to="/courses?category=Live" className={({ isActive }) => `px-3 py-2 rounded-lg text-sm font-medium transition-colors ${isActive ? 'text-indigo-600 bg-indigo-50' : 'text-gray-600 hover:text-indigo-600 hover:bg-gray-50'}`}>Live Classes</NavLink>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button className="lg:hidden p-2 rounded-lg text-gray-600 hover:text-gray-900 hover:bg-gray-100" onClick={() => setMobileMenuOpen(!mobileMenuOpen)} aria-expanded={mobileMenuOpen} aria-controls="mobile-menu" aria-label="Toggle menu">
            {mobileMenuOpen ? <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg> : <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" /></svg>}
          </button>

          {isAuthenticated ? (
            <div className="relative" ref={menuRef}>
              <button
                ref={buttonRef}
                onClick={onUserMenuToggle}
                className="flex items-center gap-2 p-1.5 rounded-lg hover:bg-gray-100 transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500"
                aria-expanded={userMenuOpen}
                aria-haspopup="true"
              >
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-violet-500 flex items-center justify-center text-white font-medium text-sm">{user?.name?.charAt(0).toUpperCase() ?? 'U'}</div>
                <div className="hidden sm:block text-left">
                  <span className="block text-sm font-semibold text-gray-900 truncate max-w-[160px]">{user?.name}</span>
                  <span className="block text-xs text-gray-500 truncate max-w-[160px]">{user?.email}</span>
                </div>
                <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${roleColors.bg} ${roleColors.text}`}>
                  {roleLabel}
                </span>
                <ChevronDownIcon className={`w-4 h-4 text-gray-400 transition-transform ${userMenuOpen ? 'rotate-180' : ''}`} />
              </button>
              {userMenuOpen && (
                <>
                  <div className="fixed inset-0 z-40" onClick={onUserMenuClose} aria-hidden="true" />
                  <div className="absolute right-0 mt-2 w-[256px] bg-white rounded-xl shadow-lg border border-gray-200 py-1 z-50 animate-fade-up" role="menu" style={{ maxWidth: 'calc(100vw - 2rem)' }}>
                    <div className="px-4 py-3 border-b border-gray-100">
                      <p className="font-semibold text-gray-900 truncate">{user?.name}</p>
                      <p className="text-sm text-gray-500 truncate">{user?.email}</p>
                    </div>
                    <nav className="px-2 py-1" role="menu" aria-label="User menu">
                      {primaryItems.length > 0 && (
                        <>
                          {primaryItems.map((item, index) => (
                            <NavLink
                              key={item.href}
                              to={item.href}
                              onClick={onUserMenuClose}
                              className={({ isActive }) => `flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${isActive ? 'bg-indigo-50 text-indigo-600' : 'text-gray-700 hover:bg-gray-50 hover:text-indigo-600'} focus:outline-none focus:ring-2 focus:ring-indigo-500`}
                              role="menuitem"
                              tabIndex={-1}
                              onKeyDown={(e) => handleMenuKeyDown(e, allMenuItems, index)}
                            >
                              <span className="w-5 h-5 flex-shrink-0" aria-hidden="true">
                                {(() => {
                                  switch (item.icon) {
                                    case 'LayoutDashboard': return <LayoutDashboardIcon className="w-5 h-5" />;
                                    case 'Award': return <AwardIcon className="w-5 h-5" />;
                                    case 'BookOpen': return <BookOpenIcon2 className="w-5 h-5" />;
                                    case 'DollarSign': return <DollarSignIcon className="w-5 h-5" />;
                                    case 'Settings': return <SettingsIcon className="w-5 h-5" />;
                                    case 'Shield': return <ShieldIcon className="w-5 h-5" />;
                                    case 'Users': return <UsersIcon className="w-5 h-5" />;
                                    case 'Users2': return <Users2Icon className="w-5 h-5" />;
                                    case 'BookOpenText': return <BookOpenTextIcon className="w-5 h-5" />;
                                    case 'GraduationCap': return <GraduationCapIcon className="w-5 h-5" />;
                                    case 'ShieldCheck': return <ShieldCheck className="w-5 h-5" />;
                                    default: return <SettingsIcon className="w-5 h-5" />;
                                  }
                                })()}
                              </span>
                              <span className="truncate">{item.label}</span>
                            </NavLink>
                          ))}
                          <hr className="my-1 border-gray-100 mx-2" />
                        </>
                      )}
                      {accountItems.map((item, index) => (
                        <NavLink
                          key={item.href}
                          to={item.href}
                          onClick={onUserMenuClose}
                          className={({ isActive }) => `flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${isActive ? 'bg-indigo-50 text-indigo-600' : 'text-gray-700 hover:bg-gray-50 hover:text-indigo-600'} focus:outline-none focus:ring-2 focus:ring-indigo-500`}
                          role="menuitem"
                          tabIndex={-1}
                          onKeyDown={(e) => handleMenuKeyDown(e, allMenuItems, primaryItems.length + index)}
                        >
                          <span className="w-5 h-5 flex-shrink-0" aria-hidden="true">
                            {(() => {
                              switch (item.icon) {
                                case 'Settings': return <SettingsIcon className="w-5 h-5" />;
                                default: return <SettingsIcon className="w-5 h-5" />;
                              }
                            })()}
                          </span>
                          <span className="truncate">{item.label}</span>
                        </NavLink>
                      ))}
                      <hr className="my-1 border-gray-100 mx-2" />
                      <button
                        onClick={onLogout}
                        className="w-full flex items-center gap-3 px-3 py-2 text-sm font-medium text-red-600 hover:bg-gray-50 transition-colors focus:outline-none focus:ring-2 focus:ring-red-500"
                        role="menuitem"
                        tabIndex={-1}
                        onKeyDown={(e) => handleMenuKeyDown(e, allMenuItems, allMenuItems.length - 1)}
                      >
                        <LogOutIcon className="w-5 h-5" aria-hidden="true" />
                        <span>Logout</span>
                      </button>
                    </nav>
                  </div>
                </>
              )}
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <span className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-full bg-gray-100 text-gray-600 text-sm font-medium">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
                <span>GUEST</span>
              </span>
              <NavLink to="/login" className="px-4 py-2 rounded-lg text-sm font-medium text-gray-600 hover:text-indigo-600 hover:bg-gray-50 transition-colors">Login</NavLink>
              <NavLink to="/register" className="px-4 py-2 rounded-lg text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 transition-colors">Register</NavLink>
            </div>
          )}
</div>

        <MobileMenu isOpen={mobileMenuOpen} onClose={() => setMobileMenuOpen(false)} isAuthenticated={isAuthenticated} user={user} onLogout={onLogout} />
      </div>
    </nav>
  </header>
  );
};

const Footer = () => (
  <footer className="bg-white border-t border-gray-200 mt-auto" role="contentinfo">
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 lg:py-16">
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-8 lg:gap-12">
        <div className="col-span-2 lg:col-span-2">
          <NavLink to="/" className="flex items-center gap-2 mb-6" aria-label="LearnNEXT Home">
            <FooterLogo />
            <span className="text-xl font-bold text-indigo-600">LearnNEXT</span>
          </NavLink>
          <p className="text-gray-500 text-sm mb-6 max-w-xs">Learn from the world's best instructors. Access 20+ courses, live classes, and verified certificates.</p>
          <div className="flex gap-4">
            <a href="#" className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center text-gray-500 hover:bg-indigo-100 hover:text-indigo-600 transition-colors" aria-label="Twitter"><svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M23 3a10.9 10.9 0 01-3.14 1.53 4.48 4.48 0 00-7.86 3v1A10.66 10.66 0 013 4s-4 9 5 13a11.64 11.64 0 01-7 2c9 5 20 0 20-12.5a4.5 4.5 0 00-.08-.83A7.72 7.72 0 0023 3z" /></svg></a>
            <a href="#" className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center text-gray-500 hover:bg-indigo-100 hover:text-indigo-600 transition-colors" aria-label="LinkedIn"><svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.065 1.143 0 2.064.925 2.064 2.065 0 1.141-.921 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" /></svg></a>
            <a href="#" className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center text-gray-500 hover:bg-indigo-100 hover:text-indigo-600 transition-colors" aria-label="GitHub"><svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M12 0C5.374 0 0 5.373 0 12c0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.305-.536-1.524.117-3.176 0 0 1.008-.322 3.301 1.23A11.509 11.509 0 0112 5.803c1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576C20.566 21.797 24 17.3 24 12c0-6.627-5.373-12-12-12z" /></svg></a>
            <a href="#" className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center text-gray-500 hover:bg-indigo-100 hover:text-indigo-600 transition-colors" aria-label="YouTube"><svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M23.498 6.186a3.016 3.016 0 00-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.506A3.017 3.017 0 00.502 6.186C0 7.257 0 12 0 12s0 4.743.502 5.814a3.016 3.016 0 002.122 2.136C4.495 20.455 12 20.455 12 20.455s7.505 0 9.377-.506a3.015 3.015 0 002.122-2.136C24 16.743 24 12 24 12s0-4.743-.502-5.814zM12 16c-2.21 0-4-1.79-4-4s1.79-4 4-4 4 1.79 4 4-1.79 4-4 4zm0-6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z" /></svg></a>
          </div>
        </div>
        <div>
          <h4 className="font-semibold text-gray-900 mb-4">Platform</h4>
          <ul className="space-y-3 text-sm text-gray-600">
            <li><a href="/courses" className="hover:text-indigo-600 transition-colors">Courses</a></li>
            <li><a href="/courses?category=Live" className="hover:text-indigo-600 transition-colors">Live Classes</a></li>
            <li><a href="/courses?category=Free" className="hover:text-indigo-600 transition-colors">Free Courses</a></li>
            <li><a href="/certificates" className="hover:text-indigo-600 transition-colors">Certificates</a></li>
          </ul>
        </div>
        <div>
          <h4 className="font-semibold text-gray-900 mb-4">Company</h4>
          <ul className="space-y-3 text-sm text-gray-600">
            <li><a href="#" className="hover:text-indigo-600 transition-colors">About Us</a></li>
            <li><a href="#" className="hover:text-indigo-600 transition-colors">Careers</a></li>
            <li><a href="#" className="hover:text-indigo-600 transition-colors">Press</a></li>
            <li><a href="#" className="hover:text-indigo-600 transition-colors">Blog</a></li>
          </ul>
        </div>
        <div>
          <h4 className="font-semibold text-gray-900 mb-4">Support</h4>
          <ul className="space-y-3 text-sm text-gray-600">
            <li><a href="#" className="hover:text-indigo-600 transition-colors">Help Center</a></li>
            <li><a href="#" className="hover:text-indigo-600 transition-colors">Contact Us</a></li>
            <li><a href="#" className="hover:text-indigo-600 transition-colors">Privacy Policy</a></li>
            <li><a href="#" className="hover:text-indigo-600 transition-colors">Terms of Service</a></li>
          </ul>
        </div>
      </div>
      <div className="mt-12 lg:mt-16 pt-8 border-t border-gray-200">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-sm text-gray-500">&copy; {new Date().getFullYear()} LearnNEXT. All rights reserved.</p>
          <div className="flex items-center gap-6 text-sm text-gray-500"><span>Made with care for learners everywhere</span></div>
        </div>
      </div>
    </div>
  </footer>
);

export default function Layout() {
  const { user, isAuthenticated } = useAppSelector((state) => state.auth);
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const [scrolled, setScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [userMenuOpen, setUserMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 10);
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleLogout = () => {
    dispatch(clearCredentials());
    navigate('/login');
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/courses?q=${encodeURIComponent(searchQuery.trim())}`);
    }
  };

  const handleUserMenuToggle = () => setUserMenuOpen(!userMenuOpen);
  const handleUserMenuClose = () => setUserMenuOpen(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setUserMenuOpen(false);
        setMobileMenuOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Header
        scrolled={scrolled}
        mobileMenuOpen={mobileMenuOpen}
        setMobileMenuOpen={setMobileMenuOpen}
        isAuthenticated={isAuthenticated}
        user={user}
        onLogout={handleLogout}
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        handleSearch={handleSearch}
        userMenuOpen={userMenuOpen}
        onUserMenuToggle={handleUserMenuToggle}
        onUserMenuClose={handleUserMenuClose}
      />
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8" role="main">
        <Outlet />
      </main>
      <Footer />
    </div>
  );
}