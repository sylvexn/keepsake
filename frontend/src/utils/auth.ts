// Define Google auth types
interface GoogleUser {
  getBasicProfile: () => {
    getId: () => string;
    getName: () => string;
    getEmail: () => string;
    getImageUrl: () => string;
  };
  getAuthResponse: () => {
    id_token: string;
  };
}

// Define user data interface
export interface UserData {
  id: string;
  name: string;
  email: string;
  imageUrl: string;
  idToken: string;
}

// Check if user is authenticated in local storage
export const isAuthenticated = (): boolean => {
  return localStorage.getItem('keepsake_auth') !== null;
};

// Get user data from local storage
export const getUserData = (): UserData | null => {
  const data = localStorage.getItem('keepsake_auth');
  return data ? JSON.parse(data) : null;
};

// Set user data to local storage
export const setUserData = (userData: UserData): void => {
  localStorage.setItem('keepsake_auth', JSON.stringify(userData));
};

// Clear user data from local storage
export const clearUserData = (): void => {
  localStorage.removeItem('keepsake_auth');
};

// Process Google user data
export const processGoogleUser = (googleUser: GoogleUser): UserData => {
  const profile = googleUser.getBasicProfile();
  const idToken = googleUser.getAuthResponse().id_token;
  
  return {
    id: profile.getId(),
    name: profile.getName(),
    email: profile.getEmail(),
    imageUrl: profile.getImageUrl(),
    idToken
  };
};

// For development/testing: Bypass Google Auth with test account
export const bypassAuth = (testMode: boolean = false): UserData => {
  const userData = {
    id: 'test-user-id',
    name: testMode ? 'Test User' : 'Local Developer',
    email: testMode ? 'test@example.com' : 'dev@local.host',
    imageUrl: `https://ui-avatars.com/api/?name=${testMode ? 'Test+User' : 'Local+Dev'}&background=random`,
    idToken: 'bypass-token-for-development-only'
  };
  
  // Store in localStorage
  setUserData(userData);
  
  return userData;
};

// Send ID token to backend for verification
export const verifyTokenWithBackend = async (idToken: string): Promise<{ 
  success: boolean; 
  user?: any;
  errorMessage?: string;
}> => {
  // For the bypass token, return success directly without backend check
  if (idToken === 'bypass-token-for-development-only') {
    console.log('Using development bypass token - skipping backend verification');
    return {
      success: true
    };
  }
  
  try {
    console.log('Making fetch request to /api/auth/google');
    const response = await fetch('/api/auth/google', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ idToken }),
    });
    
    console.log('Received response:', response.status, response.statusText);
    
    // Handle network-level errors or non-JSON responses
    if (!response.ok) {
      try {
        const data = await response.json();
        console.error('API error response:', data);
        return {
          success: false,
          errorMessage: data.error || `Server error: ${response.status} ${response.statusText}`
        };
      } catch (jsonError) {
        // If we can't parse JSON from the error response
        console.error('Failed to parse error response:', jsonError);
        return {
          success: false,
          errorMessage: `Server error (${response.status}): ${response.statusText}`
        };
      }
    }
    
    // Parse successful response
    try {
      const data = await response.json();
      console.log('Successful response data:', data);
      
      return {
        success: true,
        user: data.user
      };
    } catch (jsonError) {
      console.error('Failed to parse success response:', jsonError);
      return {
        success: false,
        errorMessage: 'Invalid response format from server'
      };
    }
  } catch (error) {
    // This will catch network errors like CORS issues or server unreachable
    console.error('Network error verifying token:', error);
    return {
      success: false,
      errorMessage: error instanceof Error 
        ? `Network error: ${error.message}` 
        : 'Network error connecting to authentication server'
    };
  }
}; 