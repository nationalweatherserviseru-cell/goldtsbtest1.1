// Показ модального окна авторизации
window.showAuth = function(type) {
    const modal = document.getElementById('authModal');
    const authForm = document.getElementById('authForm');
    
    if (type === 'register') {
        authForm.innerHTML = `
            <h2><i class="fas fa-user-plus"></i> РЕГИСТРАЦИЯ</h2>
            <input class="input-group" placeholder="Ник Roblox" id="regRoblox">
            <input class="input-group" type="password" placeholder="Пароль" id="regPass">
            <input class="input-group" placeholder="Ссылка на профиль Roblox" id="regUrl">
            <input class="input-group" placeholder="Киллы сейчас" id="regKills">
            <button class="btn-primary" id="doRegister" style="width: 100%;">Зарегистрироваться</button>
            <div id="registerError" class="login-error-message hidden"></div>
        `;
        document.getElementById('doRegister').addEventListener('click', register);
    } else {
        authForm.innerHTML = `
            <h2><i class="fas fa-sign-in-alt"></i> ВХОД</h2>
            <input class="input-group" placeholder="Ник Roblox" id="loginUser">
            <input class="input-group" type="password" placeholder="Пароль" id="loginPass">
            <button class="btn-primary" id="doLogin" style="width: 100%;">Войти</button>
            <div id="loginError" class="login-error-message hidden"></div>
        `;
        document.getElementById('doLogin').addEventListener('click', login);
    }
    
    modal.classList.remove('hidden');
};

window.closeAuthModal = function() {
    document.getElementById('authModal').classList.add('hidden');
};

// Регистрация
async function register() {
    const username = document.getElementById('regRoblox').value;
    const password = document.getElementById('regPass').value;
    const profileUrl = document.getElementById('regUrl').value;
    const kills = document.getElementById('regKills').value;
    const errorDiv = document.getElementById('registerError');
    
    if (!username || !password || !profileUrl || !kills) {
        errorDiv.textContent = 'Заполните все поля';
        errorDiv.classList.remove('hidden');
        return;
    }
    
    const currentIP = await getUserIP();
    
    const ipBanned = await isIPBanned(currentIP);
    if (ipBanned) {
        errorDiv.textContent = 'Регистрация невозможна (IP заблокирован)';
        errorDiv.classList.remove('hidden');
        return;
    }
    
    if (users.find(u => u.username === username)) {
        errorDiv.textContent = 'Ник занят';
        errorDiv.classList.remove('hidden');
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
        const { error } = await supabase.from('users').insert([newUser]);
        if (error) throw error;
        
        alert('Регистрация успешна! Теперь войдите в аккаунт.');
        closeAuthModal();
        showAuth('login');
    } catch (error) {
        errorDiv.textContent = 'Ошибка при регистрации';
        errorDiv.classList.remove('hidden');
    }
}

// Вход
async function login() {
    const username = document.getElementById('loginUser').value;
    const password = document.getElementById('loginPass').value;
    const errorDiv = document.getElementById('loginError');
    
    const currentIP = await getUserIP();
    
    const ipBanned = await isIPBanned(currentIP);
    if (ipBanned) {
        errorDiv.textContent = 'Доступ заблокирован (IP в бане)';
        errorDiv.classList.remove('hidden');
        return;
    }
    
    if (username === GOLD_USER.username && password === 'admin') {
        const { data } = await supabase
            .from('users')
            .select('*')
            .eq('username', GOLD_USER.username)
            .single();
        
        if (data && data.banned) {
            errorDiv.textContent = 'Аккаунт заблокирован';
            errorDiv.classList.remove('hidden');
            return;
        }
        
        currentUser = { ...GOLD_USER, ...data };
        localStorage.setItem('gold_tsb_session', JSON.stringify({ username: currentUser.username, loginTime: new Date().toISOString() }));
        renderNavbar();
        closeAuthModal();
        location.reload();
        return;
    }
    
    const user = users.find(u => u.username === username && u.password === password);
    if (user) {
        if (user.banned) {
            errorDiv.textContent = 'Аккаунт заблокирован';
            errorDiv.classList.remove('hidden');
            return;
        }
        
        currentUser = { ...user };
        localStorage.setItem('gold_tsb_session', JSON.stringify({ username: currentUser.username, loginTime: new Date().toISOString() }));
        renderNavbar();
        closeAuthModal();
        location.reload();
    } else {
        errorDiv.textContent = 'Неверные данные';
        errorDiv.classList.remove('hidden');
    }
}
