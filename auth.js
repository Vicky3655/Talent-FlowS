import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SUPABASE_URL = 'https://ontaucdcmrkyvpflxtti.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_x-zRHHlxLCq1gh28aTv-0w_kht1wDxa';
const supabase = createClient(
  'YOUR_SUPABASE_URL',
  'YOUR_SUPABASE_ANON_KEY'
)

let authReady = false;
let currentUser = null;
const readyCallbacks = [];

const normalizeUser = (user) => {
    if (!user) return null;
    const meta = user.user_metadata || {};
    return {
        uid: user.id,
        email: user.email || '',
        displayName: meta.full_name || meta.name || '',
        emailVerified: !!user.email_confirmed_at || user.app_metadata?.provider === 'google',
    };
};

supabase.auth.onAuthStateChange(async (event, session) => {
    currentUser = normalizeUser(session ? session.user : null);
    window.TalentFlowUser = currentUser;
    authReady = true;
    readyCallbacks.splice(0).forEach(cb => cb(currentUser));

    if (event === 'SIGNED_IN' && currentUser) {
        const profile = await window.TalentFlowAuth.loadProfile(currentUser.uid);
        if (!profile) {
            await window.TalentFlowAuth.saveProfile(currentUser.uid, { 
                fullName: currentUser.displayName, 
                email: currentUser.email, 
                provider: 'google' 
            });
        }
        const p = window.location.pathname;
        if (p.includes('login.html') || p.includes('register.html') || p.endsWith('/') || p === '') {
            window.TalentFlowAuth.redirectToRoleProfile(profile?.role || '', currentUser);
        }
    }
});

window.TalentFlowAuth = {
    supabase,
    async signInWithGoogle() {
        await supabase.auth.signInWithOAuth({
            provider: 'google',
            options: { redirectTo: window.location.origin + '/choose-role.html' }
        });
    },
    async register(name, email, password) {
        const { data, error } = await supabase.auth.signUp({ 
            email, password, options: { data: { full_name: name } } 
        });
        if (error) throw error;
        await this.saveProfile(data.user.id, { fullName: name, email, provider: 'email' });
        return { user: normalizeUser(data.user) };
    },
    async login(email, password) {
        const { data, error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        const profile = await this.loadProfile(data.user.id);
        return { user: normalizeUser(data.user), role: profile?.role || '' };
    },
    async loadProfile(uid) {
        const { data } = await supabase.from('profiles').select('*').eq('id', uid).maybeSingle();
        return data ? { ...data, fullName: data.full_name } : null;
    },
    async saveProfile(uid, data) {
        const dbMap = { id: uid };
        if (data.fullName) dbMap.full_name = data.fullName;
        if (data.email) dbMap.email = data.email;
        if (data.role !== undefined) dbMap.role = data.role;
        if (data.provider) dbPayload.provider = data.provider;
        const { error } = await supabase.from('profiles').upsert(dbMap);
        if (error) throw error;
    },
    redirectToRoleProfile(role, user) {
        const u = user || window.TalentFlowUser;
        if (u && !u.emailVerified) { window.location.href = 'verify-email.html'; return; }
        if (role === 'Instructor') window.location.href = 'instructor-profile.html';
        else if (role === 'Student') window.location.href = 'student-profile.html';
        else window.location.href = 'choose-role.html';
    },
    async setRole(role) {
        if (!window.TalentFlowUser) return;
        await this.saveProfile(window.TalentFlowUser.uid, { role });
        this.redirectToRoleProfile(role);
    },
    requireAuth() {
        return new Promise((res) => {
            const check = (u) => { if (!u) window.location.href = 'login.html'; else res(u); };
            if (authReady) check(currentUser); else readyCallbacks.push(check);
        });
    },
    logOut() { return supabase.auth.signOut().then(() => window.location.href = 'login.html'); },
    friendlyError(err) {
        const m = err.message?.toLowerCase() || "";
        if (m.includes("invalid login")) return "Incorrect email or password";
        if (m.includes("already registered")) return "User already exists. Try logging in.";
        return "Connection error — please check your Supabase SQL setup.";
    }
};
