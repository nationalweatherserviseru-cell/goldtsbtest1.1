// Используем IIFE чтобы изолировать переменные
(function() {
    // Глобальные переменные через window объект
    window.GTSB = window.GTSB || {};
    
    window.GTSB.currentUser = null;
    window.GTSB.users = [];
    window.GTSB.bannedIPs = [];
    window.GTSB.forumPosts = [];
    window.GTSB.lastPostTime = 0;
    window.GTSB.POST_COOLDOWN = 20 * 60 * 1000;
    window.GTSB.NICK_CHANGE_COOLDOWN = 7 * 24 * 60 * 60 * 1000;
    window.GTSB.supabaseClient = null;

    window.GTSB.GOLD_USER = {
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
        created_at: new Date().toISOString(),
        password: 'admin'
    };

    // Инициализация
    window.GTSB.init = async function() {
        if (typeof SUPABASE_CONFIG !== 'undefined' && SUPABASE_CONFIG.url && SUPABASE_CONFIG.anonKey) {
            window.GTSB.supabaseClient = window.supabase.createClient(
                SUPABASE_CONFIG.url,
                SUPABASE_CONFIG.anonKey
            );
            await window.GTSB.loadUsers();
            await window.GTSB.loadForumPosts();
            await window.GTSB.loadBannedIPs();
            await window.GTSB.loadActiveBanner();
            await window.GTSB.checkCurrentUser();
            window.GTSB.renderNavbar();
        } else {
            console.error('Supabase config not found!');
        }
    };

    // Загрузка пользователей
    window.GTSB.loadUsers = async function() {
        try {
            const { data } = await window.GTSB.supabaseClient.from('users').select('*');
            if (data) {
                window.GTSB.users = data.map(user => ({
                    ...user,
                    banned: user.banned && (!user.ban_expires || new Date(user.ban_expires) > new Date())
                }));
            }
            
            const goldExists = window.GTSB.users.find(u => u.username === 'Gold_TSB');
            if (!goldExists && window.GTSB.supabaseClient) {
                await window.GTSB.supabaseClient.from('users').insert([window.GTSB.GOLD_USER]);
                window.GTSB.users.push(window.GTSB.GOLD_USER);
            }
            
            window.GTSB.updateAccountCounter();
        } catch (e) {
            console.error('Error loading users:', e);
        }
    };

    // Загрузка постов форума
    window.GTSB.loadForumPosts = async function() {
        try {
            const { data } = await window.GTSB.supabaseClient
                .from('forum_posts')
                .select('*')
                .order('created_at', { ascending: false });
            
            if (data) {
                window.GTSB.forumPosts = data;
            }
        } catch (error) {
            console.error('Error loading forum posts:', error);
        }
    };

    // Загрузка забаненных IP
    window.GTSB.loadBannedIPs = async function() {
        try {
            const { data } = await window.GTSB.supabaseClient
                .from('banned_ips')
                .select('*')
                .order('banned_at', { ascending: false });
            
            window.GTSB.bannedIPs = data || [];
        } catch (error) {
            console.error('Error loading banned IPs:', error);
        }
    };

    // Загрузка активного баннера
    window.GTSB.loadActiveBanner = async function() {
        try {
            const { data } = await window.GTSB.supabaseClient
                .from('banners')
                .select('*')
                .eq('is_active', true)
                .order('created_at', { ascending: false })
                .limit(1);
            
            if (data && data.length > 0) {
                window.GTSB.showBanner(data[0].message, data[0].id);
            } else {
                const banner = document.getElementById('globalBanner');
                if (banner) banner.classList.add('hidden');
            }
        } catch (error) {
            console.error('Error loading banner:', error);
        }
    };

    window.GTSB.showBanner = function(message, bannerId) {
        const banner = document.getElementById('globalBanner');
        const messageSpan = document.getElementById('bannerMessage');
        const closeBtn = document.getElementById('closeBannerBtn');
        
        if (!banner) return;
        
        messageSpan.innerHTML = '<i class="fas fa-bullhorn" style="margin-right: 10px;"></i>' + message;
        banner.classList.remove('hidden');
        banner.dataset.bannerId = bannerId;
        
        if (window.GTSB.currentUser && window.GTSB.currentUser.username === 'Gold_TSB') {
            closeBtn.classList.remove('hidden');
        } else {
            closeBtn.classList.add('hidden');
        }
    };

    // Обновление счетчика аккаунтов
    window.GTSB.updateAccountCounter = async function() {
        try {
            const { count, error } = await window.GTSB.supabaseClient
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
    };

    // Проверка текущего пользователя
    window.GTSB.checkCurrentUser = async function() {
        const sessionStr = localStorage.getItem('gold_tsb_session');
        if (!sessionStr) return null;
        
        try {
            const session = JSON.parse(sessionStr);
            if (!session.username) return null;
            
            if (session.username === window.GTSB.GOLD_USER.username) {
                const { data } = await window.GTSB.supabaseClient
                    .from('users')
                    .select('*')
                    .eq('username', window.GTSB.GOLD_USER.username)
                    .single();
                
                if (data && !data.banned) {
                    window.GTSB.currentUser = { ...window.GTSB.GOLD_USER, ...data };
                    return window.GTSB.currentUser;
                }
                return null;
            }
            
            const user = window.GTSB.users.find(u => u.username === session.username);
            if (user && !user.banned) {
                if (user.ban_expires && new Date(user.ban_expires) < new Date()) {
                    await window.GTSB.updateUser(user.id, { banned: false, ban_reason: null, ban_expires: null });
                    return user;
                }
                window.GTSB.currentUser = user;
                return user;
            }
        } catch (e) {
            console.error('Error loading session:', e);
        }
        
        localStorage.removeItem('gold_tsb_session');
        return null;
    };

    // Обновление пользователя
    window.GTSB.updateUser = async function(id, updates) {
        try {
            await window.GTSB.supabaseClient.from('users').update(updates).eq('id', id);
            await window.GTSB.loadUsers();
            
            if (window.GTSB.currentUser && window.GTSB.currentUser.id === id) {
                const updatedUser = window.GTSB.users.find(u => u.id === id);
                if (updatedUser) {
                    window.GTSB.currentUser = updatedUser;
                    localStorage.setItem('gold_tsb_session', JSON.stringify({ username: window.GTSB.currentUser.username, loginTime: new Date().toISOString() }));
                }
            }
        } catch (e) {
            console.error('Error updating user:', e);
        }
    };

    // Рендер навигации
    window.GTSB.renderNavbar = function() {
        const area = document.getElementById('userArea');
        const adminTab = document.getElementById('adminTabLink');
        
        if (!area) return;
        
        if (window.GTSB.currentUser) {
            area.innerHTML = `
                <span onclick="location.href='/profile.html?id=${window.GTSB.currentUser.id}'"><i class="fas fa-user-circle" style="margin-right: 6px;"></i>${window.GTSB.escapeHtml(window.GTSB.currentUser.username)}</span>
                <button class="logout-btn" onclick="window.GTSB.logout()"><i class="fas fa-sign-out-alt"></i> Выйти</button>
            `;
            
            if (adminTab && window.GTSB.currentUser.role === 'admin') {
                adminTab.style.display = 'inline-block';
            } else if (adminTab) {
                adminTab.style.display = 'none';
            }
        } else {
            area.innerHTML = `
                <div class="auth-buttons">
                    <button onclick="window.GTSB.showAuthModal('login')">Вход</button>
                    <button onclick="window.GTSB.showAuthModal('register')">Регистрация</button>
                </div>
            `;
            if (adminTab) adminTab.style.display = 'none';
        }
    };

    // Выход
    window.GTSB.logout = function() {
        window.GTSB.currentUser = null;
        localStorage.removeItem('gold_tsb_session');
        window.GTSB.renderNavbar();
        location.href = '/';
    };

    // Форматирование даты
    window.GTSB.formatDate = function(dateString) {
        const date = new Date(dateString);
        const months = ['янв.', 'февр.', 'мар.', 'апр.', 'мая', 'июн.', 'июл.', 'авг.', 'сент.', 'окт.', 'нояб.', 'дек.'];
        return `${date.getFullYear()} г. ${date.getDate()} ${months[date.getMonth()]}`;
    };

    // Получение IP
    window.GTSB.getUserIP = async function() {
        try {
            const response = await fetch('https://api.ipify.org?format=json');
            const data = await response.json();
            return data.ip;
        } catch (error) {
            return '0.0.0.0';
        }
    };

    // Проверка IP бана
    window.GTSB.isIPBanned = async function(ip) {
        try {
            const { data, error } = await window.GTSB.supabaseClient
                .from('banned_ips')
                .select('*')
                .eq('ip_address', ip)
                .maybeSingle();
            
            if (error) return false;
            
            if (data) {
                if (data.ban_expires && new Date(data.ban_expires) < new Date()) {
                    await window.GTSB.supabaseClient.from('banned_ips').delete().eq('ip_address', ip);
                    return false;
                }
                return true;
            }
            return false;
        } catch (error) {
            return false;
        }
    };

    // Escape HTML
    window.GTSB.escapeHtml = function(text) {
        if (!text) return '';
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    };

    // Получение supabase клиента
    window.GTSB.getSupabase = function() {
        return window.GTSB.supabaseClient;
    };
    
    // Показать модальное окно авторизации
    window.GTSB.showAuthModal = function(type) {
        const modal = document.getElementById('authModal');
        const authForm = document.getElementById('authForm');
        
        if (!modal || !authForm) return;
        
        if (type === 'register') {
            authForm.innerHTML = `
                <h2><i class="fas fa-user-plus"></i> РЕГИСТРАЦИЯ</h2>
                <input class="input-group" placeholder="Ник Roblox" id="regRoblox">
                <input class="input-group" type="password" placeholder="Пароль" id="regPass">
                <input class="input-group" placeholder="Ссылка на профиль Roblox" id="regUrl">
                <input class="input-group" placeholder="Киллы сейчас" id="regKills">
                <button class="btn-primary" id="doRegisterBtn" style="width: 100%;">Зарегистрироваться</button>
                <div id="registerError" class="login-error-message hidden"></div>
            `;
            document.getElementById('doRegisterBtn')?.addEventListener('click', window.GTSB.register);
        } else {
            authForm.innerHTML = `
                <h2><i class="fas fa-sign-in-alt"></i> ВХОД</h2>
                <input class="input-group" placeholder="Ник Roblox" id="loginUser">
                <input class="input-group" type="password" placeholder="Пароль" id="loginPass">
                <button class="btn-primary" id="doLoginBtn" style="width: 100%;">Войти</button>
                <div id="loginError" class="login-error-message hidden"></div>
            `;
            document.getElementById('doLoginBtn')?.addEventListener('click', window.GTSB.login);
        }
        
        modal.classList.remove('hidden');
    };
    
    // Закрыть модальное окно
    window.GTSB.closeAuthModal = function() {
        const modal = document.getElementById('authModal');
        if (modal) modal.classList.add('hidden');
    };
    
    // Регистрация
    window.GTSB.register = async function() {
        const username = document.getElementById('regRoblox')?.value;
        const password = document.getElementById('regPass')?.value;
        const profileUrl = document.getElementById('regUrl')?.value;
        const kills = document.getElementById('regKills')?.value;
        const errorDiv = document.getElementById('registerError');
        
        if (!username || !password || !profileUrl || !kills) {
            if (errorDiv) {
                errorDiv.textContent = 'Заполните все поля';
                errorDiv.classList.remove('hidden');
            }
            return;
        }
        
        const currentIP = await window.GTSB.getUserIP();
        const ipBanned = await window.GTSB.isIPBanned(currentIP);
        
        if (ipBanned) {
            if (errorDiv) {
                errorDiv.textContent = 'Регистрация невозможна (IP заблокирован)';
                errorDiv.classList.remove('hidden');
            }
            return;
        }
        
        if (window.GTSB.users.find(u => u.username === username)) {
            if (errorDiv) {
                errorDiv.textContent = 'Ник занят';
                errorDiv.classList.remove('hidden');
            }
            return;
        }
        
        const newUser = {
            id: Date.now().toString(),
            username: username,
            password: password,
            roblox_nick: username,
            profile_url: profileUrl,
            kills: parseInt(kills) || 0,
            verified: false,
            role: 'user',
            banned: false,
            ban_reason: null,
            ban_expires: null,
            banned_ip: null,
            ip: currentIP,
            bio: '',
            created_at: new Date().toISOString()
        };
        
        try {
            const { error } = await window.GTSB.supabaseClient.from('users').insert([newUser]);
            if (error) throw error;
            
            alert('Регистрация успешна! Теперь войдите в аккаунт.');
            window.GTSB.closeAuthModal();
            window.GTSB.showAuthModal('login');
        } catch (error) {
            console.error('Registration error:', error);
            if (errorDiv) {
                errorDiv.textContent = 'Ошибка при регистрации';
                errorDiv.classList.remove('hidden');
            }
        }
    };
    
    // Вход
    window.GTSB.login = async function() {
        const username = document.getElementById('loginUser')?.value;
        const password = document.getElementById('loginPass')?.value;
        const errorDiv = document.getElementById('loginError');
        
        const currentIP = await window.GTSB.getUserIP();
        const ipBanned = await window.GTSB.isIPBanned(currentIP);
        
        if (ipBanned) {
            if (errorDiv) {
                errorDiv.textContent = 'Доступ заблокирован (IP в бане)';
                errorDiv.classList.remove('hidden');
            }
            return;
        }
        
        if (username === window.GTSB.GOLD_USER.username && password === 'admin') {
            const { data } = await window.GTSB.supabaseClient
                .from('users')
                .select('*')
                .eq('username', window.GTSB.GOLD_USER.username)
                .single();
            
            if (data && data.banned) {
                if (errorDiv) {
                    errorDiv.textContent = 'Аккаунт заблокирован';
                    errorDiv.classList.remove('hidden');
                }
                return;
            }
            
            window.GTSB.currentUser = { ...window.GTSB.GOLD_USER, ...data };
            localStorage.setItem('gold_tsb_session', JSON.stringify({ username: window.GTSB.currentUser.username, loginTime: new Date().toISOString() }));
            window.GTSB.renderNavbar();
            window.GTSB.closeAuthModal();
            location.reload();
            return;
        }
        
        const user = window.GTSB.users.find(u => u.username === username && u.password === password);
        if (user) {
            if (user.banned) {
                if (errorDiv) {
                    errorDiv.textContent = 'Аккаунт заблокирован';
                    errorDiv.classList.remove('hidden');
                }
                return;
            }
            
            window.GTSB.currentUser = { ...user };
            localStorage.setItem('gold_tsb_session', JSON.stringify({ username: window.GTSB.currentUser.username, loginTime: new Date().toISOString() }));
            window.GTSB.renderNavbar();
            window.GTSB.closeAuthModal();
            location.reload();
        } else {
            if (errorDiv) {
                errorDiv.textContent = 'Неверные данные';
                errorDiv.classList.remove('hidden');
            }
        }
    };

    // Экспортируем функции для использования в HTML
    window.showAuthModal = window.GTSB.showAuthModal;
    window.closeAuthModal = window.GTSB.closeAuthModal;
    window.logout = window.GTSB.logout;
    window.GTSB.closeGlobalBanner = window.GTSB.closeGlobalBanner;

    // Запуск
    document.addEventListener('DOMContentLoaded', () => {
        window.GTSB.init();
        
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
})();
