// Supabase Auth Service for ScriptGen
// Environment variables: SUPABASE_URL, SUPABASE_ANON_KEY

const SUPABASE_URL = 'https://kdgouaudgujnfsmfmswr.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtkZ291YXVkZ3VqbmZzbWZtc3dyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY0MjA0NjcsImV4cCI6MjA5MTk5NjQ2N30.T0DOoGim3c9cxqkOWwh_N8fNG6hILneBJ4gXKesSwCE';

class AuthService {
    constructor() {
        this.user = null;
        this.listeners = [];
    }

    async init() {
        // Check for existing session
        const savedUser = localStorage.getItem('scriptgen_user');
        if (savedUser) {
            try {
                this.user = JSON.parse(savedUser);
                this.notifyListeners();
            } catch (e) {
                localStorage.removeItem('scriptgen_user');
            }
        }
        
        // Check URL for OAuth callback
        const params = new URLSearchParams(window.location.search);
        if (params.has('auth_callback')) {
            await this.handleOAuthCallback();
        }
    }

    onAuthChange(callback) {
        this.listeners.push(callback);
        if (this.user) callback(this.user);
    }

    notifyListeners() {
        this.listeners.forEach(cb => cb(this.user));
    }

    async signUp(email, password) {
        try {
            const response = await fetch(`${SUPABASE_URL}/auth/v1/signup`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'apikey': SUPABASE_ANON_KEY
                },
                body: JSON.stringify({
                    email,
                    password,
                    data: { created_at: new Date().toISOString() }
                })
            });

            const data = await response.json();
            
            if (!response.ok) {
                throw new Error(data.msg || data.message || 'Signup failed');
            }

            this.user = {
                id: data.id,
                email: data.email,
                aud: data.aud
            };
            
            localStorage.setItem('scriptgen_user', JSON.stringify(this.user));
            localStorage.setItem('scriptgen_session', data.session?.access_token || '');
            this.notifyListeners();
            
            return { success: true, user: this.user };
        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    async signIn(email, password) {
        try {
            const response = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'apikey': SUPABASE_ANON_KEY
                },
                body: JSON.stringify({ email, password })
            });

            const data = await response.json();
            
            if (!response.ok) {
                throw new Error(data.msg || data.message || 'Invalid credentials');
            }

            this.user = {
                id: data.user.id,
                email: data.user.email,
                aud: data.user.aud
            };
            
            localStorage.setItem('scriptgen_user', JSON.stringify(this.user));
            localStorage.setItem('scriptgen_session', data.access_token);
            this.notifyListeners();
            
            return { success: true, user: this.user };
        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    async signInWithGitHub() {
        try {
            const response = await fetch(`${SUPABASE_URL}/auth/v1/authorize`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'apikey': SUPABASE_ANON_KEY
                },
                body: JSON.stringify({
                    provider: 'github',
                    options: {
                        redirectTo: `${window.location.origin}${window.location.pathname}?auth_callback=github`
                    }
                })
            });

            const data = await response.json();
            
            if (!response.ok) {
                throw new Error(data.msg || data.message || 'GitHub auth failed');
            }

            // Open GitHub OAuth in popup
            const width = 600, height = 700;
            const left = window.screenX + (window.outerWidth - width) / 2;
            const top = window.screenY + (window.outerHeight - height) / 2;
            
            const popup = window.open(
                data.url,
                'GitHub Auth',
                `width=${width},height=${height},left=${left},top=${top}`
            );

            // Listen for callback
            const checkInterval = setInterval(async () => {
                try {
                    if (popup.closed) {
                        clearInterval(checkInterval);
                        // Try to get session
                        const session = localStorage.getItem('scriptgen_session');
                        if (session) {
                            await this.getCurrentUser();
                        }
                    }
                } catch (e) {}
            }, 500);

        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    async signInWithGoogle() {
        try {
            const response = await fetch(`${SUPABASE_URL}/auth/v1/authorize`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'apikey': SUPABASE_ANON_KEY
                },
                body: JSON.stringify({
                    provider: 'google',
                    options: {
                        redirectTo: `${window.location.origin}${window.location.pathname}?auth_callback=google`
                    }
                })
            });

            const data = await response.json();
            
            if (!response.ok) {
                throw new Error(data.msg || data.message || 'Google auth failed');
            }

            const width = 600, height = 700;
            const left = window.screenX + (window.outerWidth - width) / 2;
            const top = window.screenY + (window.outerHeight - height) / 2;
            
            window.open(
                data.url,
                'Google Auth',
                `width=${width},height=${height},left=${left},top=${top}`
            );

        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    async getCurrentUser() {
        const session = localStorage.getItem('scriptgen_session');
        if (!session) return null;

        try {
            const response = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
                headers: {
                    'Authorization': `Bearer ${session}`,
                    'apikey': SUPABASE_ANON_KEY
                }
            });

            if (!response.ok) return null;

            const data = await response.json();
            this.user = {
                id: data.id,
                email: data.email,
                aud: data.aud
            };
            localStorage.setItem('scriptgen_user', JSON.stringify(this.user));
            this.notifyListeners();
            return this.user;
        } catch (e) {
            return null;
        }
    }

    async handleOAuthCallback() {
        // Clean URL
        window.history.replaceState({}, document.title, window.location.pathname);
        
        // Get session from URL params if present
        const params = new URLSearchParams(window.location.search);
        const accessToken = params.get('access_token');
        const refreshToken = params.get('refresh_token');
        
        if (accessToken) {
            localStorage.setItem('scriptgen_session', accessToken);
            await this.getCurrentUser();
        }
    }

    signOut() {
        this.user = null;
        localStorage.removeItem('scriptgen_user');
        localStorage.removeItem('scriptgen_session');
        this.notifyListeners();
    }

    isLoggedIn() {
        return this.user !== null;
    }

    getUser() {
        return this.user;
    }
}

// Usage stats service
class UsageService {
    constructor(auth) {
        this.auth = auth;
        this.dailyLimit = 20;
    }

    getUsage() {
        const today = new Date().toDateString();
        const saved = localStorage.getItem('scriptgen_usage');
        
        if (!saved) return { count: 0, date: today };
        
        try {
            const data = JSON.parse(saved);
            if (data.date !== today) {
                return { count: 0, date: today };
            }
            return data;
        } catch (e) {
            return { count: 0, date: today };
        }
    }

    async canGenerate() {
        if (!this.auth.isLoggedIn()) {
            return { allowed: false, reason: 'not_logged_in' };
        }

        const usage = this.getUsage();
        const remaining = this.dailyLimit - usage.count;
        
        if (remaining <= 0) {
            return { allowed: false, reason: 'limit_reached', remaining: 0 };
        }

        return { allowed: true, remaining };
    }

    async recordGeneration() {
        const usage = this.getUsage();
        usage.count++;
        localStorage.setItem('scriptgen_usage', JSON.stringify(usage));
        return usage;
    }

    getRemaining() {
        const usage = this.getUsage();
        return Math.max(0, this.dailyLimit - usage.count);
    }
}

// Create global instances
window.authService = new AuthService();
window.usageService = new UsageService(window.authService);