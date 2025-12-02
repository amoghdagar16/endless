import { supabase } from './supabase';

/**
 * Get the current session token from Supabase
 */
export async function getSessionToken(): Promise<string | null> {
  const { data: { session } } = await supabase.auth.getSession();
  return session?.access_token || null;
}

/**
 * Check if user is authenticated
 */
export async function isAuthenticated(): Promise<boolean> {
  const { data: { session } } = await supabase.auth.getSession();
  return !!session;
}

/**
 * Get current user
 */
export async function getCurrentUser() {
  const { data: { user } } = await supabase.auth.getUser();
  return user;
}

/**
 * Get the user's company ID from the backend
 * Caches the result in localStorage to avoid repeated API calls
 * If no company exists, automatically creates one with a default name
 */
export async function getCompanyId(): Promise<string | null> {
  try {
    // Check cache first
    const cached = localStorage.getItem('user_company_id');
    const cachedExpiry = localStorage.getItem('user_company_id_expiry');
    
    if (cached && cachedExpiry && Date.now() < parseInt(cachedExpiry)) {
      return cached;
    }

    // Check if user is authenticated
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      return null;
    }

    // Fetch from backend
    const { api } = await import('./api');
    let response = await api.get('/auth/my-company');
    
    // If user doesn't have a company, create one automatically
    if (response.status === 'no_company' || response.status === 'not_found') {
      const userEmail = session.user.email || '';
      const defaultCompanyName = userEmail.split('@')[0] + "'s Company";
      
      try {
        console.log('Auto-creating company for user:', userEmail);
        const createResponse = await api.post('/auth/signup', {
          company_name: defaultCompanyName,
          user_name: session.user.user_metadata?.full_name || session.user.email?.split('@')[0] || 'User',
          user_email: userEmail,
        });
        
        console.log('Company creation response:', createResponse);
        
        if (createResponse.status === 'success' && createResponse.company_id) {
          const companyId = createResponse.company_id;
          // Cache for 5 minutes
          localStorage.setItem('user_company_id', companyId);
          localStorage.setItem('user_company_id_expiry', (Date.now() + 5 * 60 * 1000).toString());
          return companyId;
        } else {
          console.error('Company creation returned unexpected response:', createResponse);
        }
      } catch (createError: any) {
        console.error('Failed to auto-create company:', createError);
        console.error('Error details:', createError.response?.data || createError.message);
        // Don't throw - return null so UI can show error
      }
    }
    
    if (response.status === 'success' && response.company_id) {
      // Cache for 5 minutes
      localStorage.setItem('user_company_id', response.company_id);
      localStorage.setItem('user_company_id_expiry', (Date.now() + 5 * 60 * 1000).toString());
      return response.company_id;
    }
    
    return null;
  } catch (error) {
    console.error('Error fetching company ID:', error);
    // Return cached value if available, even if expired
    const cached = localStorage.getItem('user_company_id');
    return cached || null;
  }
}

/**
 * Clear cached company ID (call this on logout)
 */
export function clearCompanyId() {
  localStorage.removeItem('user_company_id');
  localStorage.removeItem('user_company_id_expiry');
}

/**
 * Sign out
 */
export async function signOut() {
  clearCompanyId();
  await supabase.auth.signOut();
}

