import { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { 
  Navbar, 
  NavbarMenuToggle, 
  NavbarMenu, 
  NavbarMenuItem 
} from "@heroui/navbar";
import { isAuthenticated, getUserData, setUserData, clearUserData, UserData, verifyTokenWithBackend } from "../utils/auth";

// Define Google auth types
declare global {
  interface Window {
    google: any;
    googleAuthInitialized: boolean;
  }
}

interface MainLayoutProps {
  children: React.ReactNode;
}

const MainLayout: React.FC<MainLayoutProps> = ({ children }) => {
  const location = useLocation();
  const [isLoggedIn, setIsLoggedIn] = useState(isAuthenticated());
  const [user, setUser] = useState<UserData | null>(getUserData());
  const [authError, setAuthError] = useState<string | null>(null);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  
  // Navigation links
  const navItems = [
    { name: "Dashboard", href: "/", active: location.pathname === "/" },
    { name: "Photos", href: "/photos", active: location.pathname === "/photos" },
    { name: "Admin", href: "/admin", active: location.pathname === "/admin" },
  ];

  // Initialize Google Identity Services
  const initializeGoogleAuth = () => {
    console.log('Initializing Google Identity Services...');
    
    if (!window.google || !window.google.accounts) {
      console.error('Google Identity Services not available');
      setAuthError('Google authentication not available. Please reload the page and try again.');
      return;
    }
    
    try {
      // Initialize Google Identity Services
      window.google.accounts.id.initialize({
        client_id: '80900908307-8kjc4tcjjt26kk53taogjj1qr3es80mc.apps.googleusercontent.com',
        callback: handleGoogleCredentialResponse,
        auto_select: false,
        cancel_on_tap_outside: true,
      });
      
      // Render the Google Sign-In button
      renderGoogleButton();
      
      window.googleAuthInitialized = true;
      console.log('Google Identity Services initialized successfully');
    } catch (error) {
      console.error('Error initializing Google Identity Services:', error);
      setAuthError(`Error initializing Google authentication: ${error instanceof Error ? error.message : String(error)}`);
    }
  };
  
  // Function to render the Google Sign-In button
  const renderGoogleButton = () => {
    console.log('Rendering Google Sign-In button');
    const buttonContainer = document.getElementById('google-sign-in-button');
    
    if (buttonContainer && window.google && window.google.accounts) {
      // Clear any existing content in the container
      buttonContainer.innerHTML = '';
      
      window.google.accounts.id.renderButton(
        buttonContainer,
        { 
          type: 'standard',
          theme: 'outline', 
          size: 'large',
          text: 'signin_with',
          shape: 'rectangular',
          logo_alignment: 'left',
          width: '100%'
        }
      );
    } else {
      console.warn('Button container or Google Identity Services not available for rendering');
    }
  };
  
  // Initial load of Google Identity Services
  useEffect(() => {
    // Load the new Google Identity Services library
    const loadGoogleIdentityServices = () => {
      console.log('Loading Google Identity Services...');
      
      // Create script tag
      const script = document.createElement('script');
      script.src = 'https://accounts.google.com/gsi/client';
      script.async = true;
      script.defer = true;
      script.onload = () => {
        console.log('Google Identity Services loaded successfully');
        initializeGoogleAuth();
      };
      script.onerror = (error) => {
        console.error('Failed to load Google Identity Services:', error);
        setAuthError('Failed to load Google authentication. Please try again later.');
      };
      
      // Add the script to the document
      document.body.appendChild(script);
    };
    
    // Check if Google Identity Services are already loaded
    if (!window.google || !window.google.accounts) {
      loadGoogleIdentityServices();
    } else if (!window.googleAuthInitialized) {
      initializeGoogleAuth();
    }
  }, []);
  
  // Re-render Google button when isLoggedIn changes (for logout case)
  useEffect(() => {
    // Only render the button when not logged in and Google Identity Services is initialized
    if (!isLoggedIn && window.google && window.google.accounts && window.googleAuthInitialized) {
      console.log('User logged out, re-rendering Google Sign-In button');
      
      // Small timeout to ensure DOM is ready
      setTimeout(() => {
        renderGoogleButton();
      }, 100);
    }
  }, [isLoggedIn]);
  
  // Handle Google Sign-In credential response
  const handleGoogleCredentialResponse = async (response: any) => {
    console.log('Google credential response received:', response);
    
    try {
      if (!response || !response.credential) {
        throw new Error('Invalid credential response');
      }
      
      const idToken = response.credential;
      
      // Decode the ID token to get basic user info
      const payload = decodeJwt(idToken);
      console.log('Decoded JWT payload:', payload);
      
      if (!payload) {
        throw new Error('Failed to decode JWT token');
      }
      
      // Create user data
      const userData: UserData = {
        id: payload.sub,
        name: payload.name,
        email: payload.email,
        imageUrl: payload.picture,
        idToken: idToken
      };
      
      // Verify token with backend
      console.log('Verifying token with backend...');
      const verificationResult = await verifyTokenWithBackend(idToken);
      
      if (verificationResult.success) {
        console.log('Token verified successfully');
        
        // Store user data
        setUser(userData);
        setUserData(userData);
        setIsLoggedIn(true);
        setAuthError(null);
      } else {
        console.error('Failed to verify token with backend:', verificationResult.errorMessage);
        setAuthError(`Authentication failed: ${verificationResult.errorMessage || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Error processing Google credential:', error);
      setAuthError(`Error processing authentication: ${error instanceof Error ? error.message : String(error)}`);
    }
  };
  
  // Simple JWT decoder function (no validation, just for getting payload)
  const decodeJwt = (token: string) => {
    try {
      const base64Url = token.split('.')[1];
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
      const jsonPayload = decodeURIComponent(atob(base64).split('').map(c => {
        return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
      }).join(''));
      
      return JSON.parse(jsonPayload);
    } catch (error) {
      console.error('Error decoding JWT:', error);
      return null;
    }
  };
  
  // Sign out function
  const signOut = () => {
    try {
      console.log('Signing out user:', user?.email);
      
      // Always clear local storage and state first
      clearUserData();
      setUser(null);
      setIsLoggedIn(false);
      
      // Then try Google sign out if appropriate
      if (window.google && window.google.accounts) {
        try {
          // Google Identity Services doesn't have an explicit sign-out method
          // but we can revoke the token
          console.log('Revoking Google authentication token');
          window.google.accounts.id.disableAutoSelect();
        } catch (error: unknown) {
          console.error('Error with Google sign out:', error);
        }
      } else {
        console.log('No Google Identity Services instance available, using direct logout');
      }
    } catch (error: unknown) {
      console.error('Error during sign out process:', error);
      // Still attempt to clear data even if there was an error
      try {
        clearUserData();
        setUser(null);
        setIsLoggedIn(false);
      } catch (finalError: unknown) {
        console.error('Critical error during fallback sign out:', finalError);
      }
    }
  };

  // If not logged in, show login instead
  if (!isLoggedIn) {
    return (
      <div className="min-h-screen bg-background">
        <div className="flex flex-col items-center justify-center min-h-screen p-4">
          <div className="w-full max-w-md p-6 bg-card rounded-lg shadow-lg">
            <h1 className="text-2xl font-bold mb-6 text-center">Keepsake Login</h1>
            
            <div className="space-y-4">
              {/* The Google Sign-In button will be rendered here */}
              <div id="google-sign-in-button" className="flex justify-center"></div>
              
              {authError && (
                <div className="text-red-500 text-sm mt-2">
                  {authError}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar>
        <div className="container mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link to="/" className="text-lg font-bold">
              Keepsake
            </Link>
            <nav className="hidden md:flex gap-6">
              {navItems.map((item) => (
                <Link
                  key={item.name}
                  to={item.href}
                  className={`text-sm font-medium ${
                    item.active ? "text-foreground" : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {item.name}
                </Link>
              ))}
            </nav>
          </div>
          <div className="flex items-center gap-4">
            {user && (
              <div className="flex items-center gap-2">
                <img 
                  src={user.imageUrl} 
                  alt={user.name}
                  className="w-8 h-8 rounded-full" 
                />
                <span className="text-sm font-medium hidden md:inline">{user.name}</span>
              </div>
            )}
            <button
              onClick={signOut}
              className="text-sm font-medium text-muted-foreground hover:text-foreground"
            >
              Logout
            </button>
            <NavbarMenuToggle 
              className="md:hidden"
              onChange={() => setIsMenuOpen(!isMenuOpen)}
            />
          </div>
        </div>
        
        <NavbarMenu>
          <div className="pt-4 pb-6 px-4 space-y-4">
            {navItems.map((item) => (
              <NavbarMenuItem key={item.name}>
                <Link
                  to={item.href}
                  className={`text-lg font-medium block py-3 px-2 rounded transition-colors ${
                    item.active 
                      ? "bg-primary/10 text-primary" 
                      : "text-foreground hover:bg-muted/50"
                  }`}
                  onClick={() => setIsMenuOpen(false)}
                >
                  {item.name}
                </Link>
              </NavbarMenuItem>
            ))}
            
            <div className="pt-4 border-t border-border">
              {user && (
                <div className="flex items-center gap-3 py-3 px-2">
                  <img 
                    src={user.imageUrl} 
                    alt={user.name}
                    className="w-10 h-10 rounded-full" 
                  />
                  <span className="text-md font-medium">{user.name}</span>
                </div>
              )}
              <button
                onClick={signOut}
                className="w-full text-left py-3 px-2 text-md font-medium text-red-500 hover:bg-muted/50 rounded transition-colors"
              >
                Logout
              </button>
            </div>
          </div>
        </NavbarMenu>
      </Navbar>
      <main>{children}</main>
    </div>
  );
};

export default MainLayout; 