// Глобальные переменные
let currentUser = null;
let users = [];
let bannedIPs = [];
let forumPosts = [];
let lastPostTime = 0;
const POST_COOLDOWN = 20 * 60 * 1000;
const NICK_CHANGE_COOLDOWN = 7 * 24 * 60 * 60 * 1000;

const GOLD_USER = {
    id: 'gold-tsb-admin',
    username: 'Gold_TSB',
    roblox_nick: 'Gold_TSB',
    profile_url: 'https://www.roblox.com/users/1/profile',
    kills: 999999,
    verified: true,
    role: 'admin',
    banned: false,
    ban_reason: null,
    ban_expires: null,
    banned_ip: null,
    ip: '0.0.0.0',
    bio: 'Основатель проекта',
    created_at: new Date().toISOString()
};

// Инициализация Supabase из глобальной переменной (будет из config.js)
let supabase = null;

// Функции для работы с Supabase
async function initSupabase() {
    if (typeof SUPABASE_CONFIG !== 'undefined') {
        supabase = window.supabase.createClient(
            SUPABASE_CONFIG.url,
            SUPABASE_CONFIG.anonKey
        );
        await loadUsers();
        await loadForumPosts();
        await loadBannedIPs();
        await loadActiveBanner();
        await checkCurrentUser();
        renderNavbar();
    }
}

// Загрузка пользователей
async function loadUsers() {
    try {
        const { data } = await supabase.from('users').select('*');
        if (data) {
            users = data.map(user => ({
                ...user,
                banned: user.banned && (!user.ban_expires || new Date(user.ban_expires) > new Date())
            }));
        }
        
        // Проверяем наличие Gold_TSB
        const goldExists = users.find(u => u.username === 'Gold_TSB');
        if (!goldExists) {
            await supabase.from('users').insert([GOLD_USER]);
            users.push(GOLD_USER);
        }
        
        updateAccountCounter();
    } catch (e) {
        console.error('Error loading users:', e);
    }
}

// Загрузка постов форума
async function loadForumPosts() {
    try {
        const { data } = await supabase
            .from('forum_posts')
            .select('*')
            .order('created_at', { ascending: false });
        
        if (data) {
            forumPosts = data;
        }
    } catch (error) {
        console.error('Error loading forum posts:', error);
    }
}

// Загрузка забаненных IP
async function loadBannedIPs() {
    try {
        const { data } = await supabase
            .from('banned_ips')
            .select('*')
            .order('banned_at', { ascending: false });
        
        bannedIPs = data || [];
    } catch (error) {
        console.error('Error loading banned IPs:', error);
    }
}

// Загрузка активного баннера
async function loadActiveBanner() {
    try {
        const { data } = await supabase
            .from('banners')
            .select('*')
            .eq('is_active', true)
            .order('created_at', { ascending: false })
            .limit(1);
        
        if (data && data.length > 0) {
            showBanner(data[0].message, data[0].id);
        } else {
            document.getElementById('globalBanner')?.classList.add('hidden');
        }
    } catch (error) {
        console.error('Error loading banner:', error);
    }
}

function showBanner(message, bannerId) {
    const banner = document.getElementById('globalBanner');
    const messageSpan = document.getElementById('bannerMessage');
    const closeBtn = document.getElementById('closeBannerBtn');
    
    if (!banner) return;
    
    messageSpan.innerHTML = '<i class="fas fa-bullhorn" style="margin-right: 10px;"></i>' + message;
    banner.classList.remove('hidden');
    banner.dataset.bannerId = bannerId;
    
    if (currentUser && currentUser.username === 'Gold_TSB') {
        closeBtn.classList.remove('hidden');
    } else {
        closeBtn.classList.add('hidden');
    }
}

window.closeGlobalBanner = async function() {
    if (!currentUser || currentUser.username !== 'Gold_TSB') {
        alert('Только Gold_TSB может закрыть баннер');
        return;
    }
    
    const banner = document.getElementById('globalBanner');
    const bannerId = banner?.dataset.bannerId;
    
    try {
        await supabase
            .from('banners')
            .update({ 
                is_active: false,
                deactivated_at: new Date()
            })
            .eq('id', bannerId);
        
        banner.classList.add('hidden');
    } catch (error) {
        console.error('Error closing banner:', error);
    }
};

// Обновление счетчика аккаунтов
async function updateAccountCounter() {
    try {
        const { count, error } = await supabase
            .from('users')
            .select('*', { count: 'exact', head: true });
        
        if (error) throw error;
        
        const counterElement = document.getElementById('accountCounter');
        if (counterElement) {
            counterElement.textContent = count ? count.toLocaleString() + '+' : '0+';
        }
    } catch (error) {
        console.error('Error updating counter:', error);
    }
}

// Проверка текущего пользователя из localStorage
async function checkCurrentUser() {
    const sessionStr = localStorage.getItem('gold_tsb_session');
    if (!sessionStr) return null;
    
    try {
        const session = JSON.parse(sessionStr);
        if (!session.username) return null;
        
        if (session.username === GOLD_USER.username) {
            const { data } = await supabase
                .from('users')
                .select('*')
                .eq('username', GOLD_USER.username)
                .single();
            
            if (data && !data.banned) {
                currentUser = { ...GOLD_USER, ...data };
                return currentUser;
            }
            return null;
        }
        
        const user = users.find(u => u.username === session.username);
        if (user && !user.banned) {
            if (user.ban_expires && new Date(user.ban_expires) < new Date()) {
                await updateUser(user.id, { banned: false, ban_reason: null, ban_expires: null });
                return user;
            }
            currentUser = user;
            return user;
        }
    } catch (e) {
        console.error('Error loading session:', e);
    }
    
    localStorage.removeItem('gold_tsb_session');
    return null;
}

// Обновление пользователя
async function updateUser(id, updates) {
    try {
        await supabase.from('users').update(updates).eq('id', id);
        await loadUsers();
        
        if (currentUser && currentUser.id === id) {
            const updatedUser = users.find(u => u.id === id);
            if (updatedUser) {
                currentUser = updatedUser;
                localStorage.setItem('gold_tsb_session', JSON.stringify({ username: currentUser.username, loginTime: new Date().toISOString() }));
            }
        }
    } catch (e) {
        console.error('Error updating user:', e);
    }
}

// Рендер навигации
function renderNavbar() {
    const area = document.getElementById('userArea');
    const adminTab = document.getElementById('adminTabLink');
    
    if (!area) return;
    
    if (currentUser) {
        area.innerHTML = `
            <span onclick="location.href='/profile.html?id=${currentUser.id}'"><i class="fas fa-user-circle" style="margin-right: 6px;"></i>${currentUser.username}</span>
            <button class="logout-btn" onclick="logout()"><i class="fas fa-sign-out-alt"></i> Выйти</button>
        `;
        
        if (adminTab && currentUser.role === 'admin') {
            adminTab.style.display = 'inline-block';
        } else if (adminTab) {
            adminTab.style.display = 'none';
        }
    } else {
        area.innerHTML = `
            <div class="auth-buttons">
                <button onclick="showAuth('login')">Вход</button>
                <button onclick="showAuth('register')">Регистрация</button>
            </div>
        `;
        if (adminTab) adminTab.style.display = 'none';
    }
}

// Выход
window.logout = function() {
    currentUser = null;
    localStorage.removeItem('gold_tsb_session');
    renderNavbar();
    location.href = '/';
};

// Форматирование даты
function formatDate(dateString) {
    const date = new Date(dateString);
    const months = ['янв.', 'февр.', 'мар.', 'апр.', 'мая', 'июн.', 'июл.', 'авг.', 'сент.', 'окт.', 'нояб.', 'дек.'];
    return `${date.getFullYear()} г. ${date.getDate()} ${months[date.getMonth()]}`;
}

// Получение IP
async function getUserIP() {
    try {
        const response = await fetch('https://api.ipify.org?format=json');
        const data = await response.json();
        return data.ip;
    } catch (error) {
        return '0.0.0.0';
    }
}

// Проверка IP бана
async function isIPBanned(ip) {
    try {
        const { data, error } = await supabase
            .from('banned_ips')
            .select('*')
            .eq('ip_address', ip)
            .maybeSingle();
        
        if (error) return false;
        
        if (data) {
            if (data.ban_expires && new Date(data.ban_expires) < new Date()) {
                await supabase.from('banned_ips').delete().eq('ip_address', ip);
                return false;
            }
            return true;
        }
        return false;
    } catch (error) {
        return false;
    }
}

// Запуск инициализации
document.addEventListener('DOMContentLoaded', () => {
    initSupabase();
    
    // Подсветка активной страницы
    const currentPage = window.location.pathname;
    document.querySelectorAll('.nav-links a').forEach(link => {
        const href = link.getAttribute('href');
        if (href === currentPage || (currentPage === '/' && href === '/')) {
            link.classList.add('active');
        } else if (currentPage.includes(href) && href !== '/') {
            link.classList.add('active');
        }
    });
});
