
import { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Menu, X, Plus, User, Home, LogIn, LogOut, Moon, Sun, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';

const Navbar = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { user, profile, signOut } = useAuth();
  const { theme, setTheme } = useTheme();
  
  const isActive = (path: string) => location.pathname === path;
  
  const toggleMenu = () => setIsMenuOpen(!isMenuOpen);

  const handleSignOut = async () => {
    await signOut();
    setIsMenuOpen(false);
  };
  const isProfileActive = location.pathname.startsWith('/profile');
  const handleProfileToggle = () => {
    if (isProfileActive) {
      navigate('/');
    } else {
      navigate(`/profile/${user?.id}`);
    }
    setIsMenuOpen(false);
  };
  
  
  return (
    <header className="sticky top-0 z-50 bg-background/80 backdrop-blur-md border-b border-border">
      <div className="container flex h-16 items-center justify-between px-4">
        <Link to="/" className="flex items-center space-x-2">
          <div className="size-10 rounded-full bg-primary flex items-center justify-center">
            <svg viewBox="0 0 24 24" fill="none" className="size-5 text-primary-foreground">
              <path
                d="M14.5 8.5c0 .828-.448 1.5-1 1.5s-1-.672-1-1.5S13.448 7 14 7s.5.672.5 1.5z"
                fill="currentColor"
              />
              <path
                d="M9.5 8.5c0 .828-.448 1.5-1 1.5s-1-.672-1-1.5S8.448 7 9 7s.5.672.5 1.5z"
                fill="currentColor"
              />
              <path
                fillRule="evenodd"
                clipRule="evenodd"
                d="M12 21a9 9 0 100-18 9 9 0 000 18zm-4.5-5.5c0 2.485 2.015 4.5 4.5 4.5s4.5-2.015 4.5-4.5S14.485 11 12 11s-4.5 2.015-4.5 4.5z"
                fill="currentColor"
              />
            </svg>
          </div>
          <span className="font-semibold text-lg tracking-tight">VoiceSphere</span>
        </Link>
        
        {/* Desktop navigation */}
        <nav className="hidden md:flex items-center space-x-6">
          <Link 
            to="/" 
            className={`transition-colors hover:text-primary ${isActive('/') ? 'text-primary font-medium' : 'text-muted-foreground'}`}
          >
            Home
          </Link>
          {user && (
            <Link 
              to="/create" 
              className={`transition-colors hover:text-primary ${isActive('/create') ? 'text-primary font-medium' : 'text-muted-foreground'}`}
            >
              Create Room
            </Link>
          )}
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            aria-label="Toggle theme"
          >
            {theme === 'dark' ? (
              <Sun size={18} className="text-yellow-400" />
            ) : (
              <Moon size={18} />
            )}
          </Button>
          {user ? (
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="icon"
                className={`rounded-full ${isProfileActive ? 'ring-2 ring-primary' : ''}`}
                onClick={handleProfileToggle}
              >
                <Avatar className="size-8">
                  <AvatarImage src={profile?.avatar_url || `https://ui-avatars.com/api/?name=${profile?.full_name || user.email}&background=random`} />
                  <AvatarFallback>
                    {profile?.full_name?.charAt(0) || user.email?.charAt(0) || 'U'}
                  </AvatarFallback>
                </Avatar>
              </Button>
              <Button variant="outline" size="sm" onClick={handleSignOut}>
                <LogOut size={16} className="mr-2" />
                Logout
              </Button>
            </div>
          ) : (
            <Button onClick={() => navigate('/auth')}>
              <LogIn size={16} className="mr-2" />
              Sign In
            </Button>
          )}
        </nav>
        
        {/* Mobile menu button */}
        <div className="md:hidden flex items-center gap-2">
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            aria-label="Toggle theme"
          >
            {theme === 'dark' ? (
              <Sun size={18} className="text-yellow-400" />
            ) : (
              <Moon size={18} />
            )}
          </Button>
          <button 
            className="p-2 text-muted-foreground hover:text-primary transition-colors" 
            onClick={toggleMenu}
            aria-label="Toggle menu"
          >
            {isMenuOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </div>
      
      {/* Mobile menu */}
      {isMenuOpen && (
        <div className="md:hidden glass-panel animate-fade-in">
          <nav className="flex flex-col space-y-3 p-4">
            <Link 
              to="/" 
              className="flex items-center space-x-2 p-2 rounded-md hover:bg-accent transition-colors"
              onClick={() => setIsMenuOpen(false)}
            >
              <Home size={18} />
              <span>Home</span>
            </Link>
            {user && (
              <Link 
                to="/create" 
                className="flex items-center space-x-2 p-2 rounded-md hover:bg-accent transition-colors"
                onClick={() => setIsMenuOpen(false)}
              >
                <Plus size={18} />
                <span>Create Room</span>
              </Link>
            )}
            {user ? (
              <>
               <Button 
                    variant="ghost"
                    className="flex items-center space-x-2 p-2 rounded-md hover:bg-accent transition-colors w-full justify-start"
                    onClick={handleProfileToggle}
                  >
                    <User size={18} />
                    <span>{isProfileActive ? 'Close Profile' : 'Profile'}</span>
                  </Button>
                  <Button 
                    variant="outline" 
                    className="flex items-center justify-start p-2 h-auto"
                    onClick={handleSignOut}
                  >
                    <LogOut size={18} className="mr-2" />
                    <span>Logout</span>
                  </Button>
              </>
            ) : (
              <Button 
                className="flex items-center justify-start p-2 h-auto"
                onClick={() => {
                  navigate('/auth');
                  setIsMenuOpen(false);
                }}
              >
                <LogIn size={18} className="mr-2" />
                <span>Sign In</span>
              </Button>
            )}
          </nav>
        </div>
      )}
    </header>
  );
};

export default Navbar;
