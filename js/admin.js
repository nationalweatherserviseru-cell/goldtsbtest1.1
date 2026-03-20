async function renderAdminPanel() {
    if (!currentUser || currentUser.role !== 'admin') {
        document.getElementById('adminPanel').innerHTML = `
            <div class="error-box">
                <i class="fas fa-exclamation-triangle" style="font-size: 2rem; margin-bottom: 15px; display: block;"></i>
                ОШИБКА ДОСТУПА<br>
                <span style="font-size: 0.95rem;">У вас нет прав администратора</span>
            </div>
        `;
        return;
    }
    
    await loadBannedIPs();
    const bannerHistory = await getBannerHistory();

    let bannedIPsHtml = '';
    bannedIPs.forEach(ipBan => {
        const expiryText = ipBan.ban_expires ? 
            `до ${new Date(ipBan.ban_expires).toLocaleString()}` : 
            'навсегда';
        
        bannedIPsHtml += `
            <div class="ip-ban-item">
                <div><strong>IP: ${ipBan.ip_address}</strong> (${expiryText})</div>
                <div><small>Причина: ${ipBan.reason || 'не указана'}</small></div>
                <button class="small green" onclick="unbanIP('${ipBan.ip_address}')">Разбанить IP</button>
            </div>
        `;
    });

    let bannerHistoryHtml = '';
    bannerHistory.forEach(banner => {
        bannerHistoryHtml += `
            <div class="banner-history-item">
                <div><strong>${escapeHtml(banner.message)}</strong> ${banner.is_active ? '(активен)' : ''}</div>
            </div>
        `;
    });

    document.getElementById('adminPanel').innerHTML = `
        <h2><i class="fas fa-shield-alt"></i> АДМИН-ПАНЕЛЬ</h2>
        
        <div class="admin-panel-section">
            <h3><i class="fas fa-search"></i> ПОИСК ПОЛЬЗОВАТЕЛЯ</h3>
            <div class="search-user">
                <input type="text" id="adminSearchUsername" placeholder="Введите ник аккаунта">
                <button id="adminSearchBtn" class="btn-primary"><i class="fas fa-search"></i> Найти</button>
            </div>
            <div id="adminSearchResult"></div>
        </div>

        <div class="admin-panel-section">
            <h3><i class="fas fa-bullhorn"></i> ГЛОБАЛЬНЫЙ БАННЕР</h3>
            <input type="text" id="bannerText" class="input-group" placeholder="Введите текст баннера...">
            <button class="btn-primary" id="publishGlobalBanner">ОПУБЛИКОВАТЬ</button>
            
            <h4 style="margin-top: 20px;">История баннеров</h4>
            <div style="max-height: 200px; overflow-y: auto;">
                ${bannerHistoryHtml || '<p>Нет истории</p>'}
            </div>
        </div>

        <div class="admin-panel-section">
            <h3><i class="fas fa-ban"></i> ЗАБАНЕННЫЕ IP</h3>
            <div>
                ${bannedIPsHtml || '<p>Нет забаненных IP</p>'}
            </div>
        </div>
    `;

    document.getElementById('adminSearchBtn')?.addEventListener('click', adminSearchUser);
    document.getElementById('publishGlobalBanner')?.addEventListener('click', () => {
        const text = document.getElementById('bannerText').value;
        if (text) publishBanner(text);
    });
    document.getElementById('adminSearchUsername')?.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') adminSearchUser();
    });
}

async function adminSearchUser() {
    const nick = document.getElementById('adminSearchUsername').value.trim();
    if (!nick) return;
    
    const user = users.find(u => u.roblox_nick === nick && u.username !== 'Gold_TSB');
    
    if (!user) {
        document.getElementById('adminSearchResult').innerHTML = `
            <div class="error-box" style="padding: 15px;">
                Пользователь не найден
            </div>
        `;
        return;
    }

    const relatedAccounts = users.filter(u => u.ip === user.ip && u.id !== user.id);

    let relatedHtml = '';
    if (relatedAccounts.length > 0) {
        relatedHtml = `
            <div class="related-accounts">
                <h4><i class="fas fa-link"></i> Связанные аккаунты (${relatedAccounts.length})</h4>
                ${relatedAccounts.map(acc => `
                    <div class="related-account-item" onclick="location.href='/profile.html?id=${acc.id}'">
                        <strong>${escapeHtml(acc.roblox_nick)}</strong> 
                        ${acc.banned ? '<span style="color: #ff4d4f;">(забанен)</span>' : ''}
                        ${acc.verified ? '<span style="color: #4caf50;">(верифицирован)</span>' : ''}
                    </div>
                `).join('')}
            </div>
        `;
    }

    document.getElementById('adminSearchResult').innerHTML = `
        <div class="profile-card">
            <h3>${escapeHtml(user.roblox_nick)}</h3>
            <p><i class="fas fa-link" style="color: #ff8c00;"></i> <a href="${user.profile_url}" target="_blank">Профиль Roblox</a></p>
            <p><span class="${user.verified ? 'kill-badge' : 'kill-badge unverified'}">
                <i class="fas fa-skull"></i> Киллы: ${user.kills.toLocaleString()} ${!user.verified ? '(не подтверждены)' : ''}
            </span></p>
            <p><strong>Статус:</strong> ${user.banned ? '<span style="color: #ff4d4f;">Забанен</span>' : '<span style="color: #4caf50;">Активен</span>'}</p>
            
            ${relatedHtml}
            
            <div style="margin-top: 20px;">
                <h4>УПРАВЛЕНИЕ</h4>
                <div class="ban-controls">
                    <select id="adminBanDuration" class="ban-duration">
                        <option value="1">1 час</option>
                        <option value="6">6 часов</option>
                        <option value="12">12 часов</option>
                        <option value="24">1 день</option>
                        <option value="72">3 дня</option>
                        <option value="168">7 дней</option>
                        <option value="720">30 дней</option>
                        <option value="0">Навсегда</option>
                    </select>
                    <input type="text" id="adminBanReason" class="ban-reason" placeholder="Причина">
                    <button class="ban-button" onclick="adminBanFromSearch('${user.id}')">
                        <i class="fas fa-ban"></i> Бан
                    </button>
                </div>
                <div style="margin-top: 10px; display: flex; gap: 10px;">
                    <button class="small green" onclick="adminVerifyFromSearch('${user.id}')">
                        <i class="fas fa-check-circle"></i> Подтвердить
                    </button>
                    ${user.banned ? `
                        <button class="small green" onclick="adminUnbanFromSearch('${user.id}')">
                            <i class="fas fa-undo"></i> Разбанить
                        </button>
                    ` : ''}
                    ${currentUser?.username === 'Gold_TSB' ? `
                        <button class="small" style="background: #ff8c00;" onclick="adminMakeAdminFromSearch('${user.id}')">
                            <i class="fas fa-crown"></i> Сделать админом
                        </button>
                    ` : ''}
                </div>
            </div>
        </div>
    `;
}

window.adminBanFromSearch = async function(userId) {
    const duration = document.getElementById('adminBanDuration').value;
    const reason = document.getElementById('adminBanReason').value;
    
    if (!reason) {
        alert('Введите причину бана');
        return;
    }
    
    const durationHours = parseInt(duration) === 0 ? null : parseInt(duration);
    await banUser(userId, reason, durationHours);
    adminSearchUser();
};

window.adminUnbanFromSearch = async function(userId) {
    if (confirm('Разбанить пользователя?')) {
        await unbanUser(userId);
        adminSearchUser();
    }
};

window.adminVerifyFromSearch = async function(userId) {
    await updateUser(userId, { verified: true });
    alert('Киллы подтверждены');
    adminSearchUser();
};

window.adminMakeAdminFromSearch = async function(userId) {
    if (currentUser?.username !== 'Gold_TSB') {
        alert('Только Gold_TSB может выдавать права администратора');
        return;
    }
    await updateUser(userId, { role: 'admin' });
    alert('Права администратора выданы');
    adminSearchUser();
};

async function banUser(userId, reason, durationHours = null) {
    try {
        const user = users.find(u => u.id === userId);
        if (!user) return;
        
        const banExpires = durationHours ? new Date(Date.now() + durationHours * 60 * 60 * 1000) : null;
        
        await updateUser(userId, { 
            banned: true, 
            ban_reason: reason,
            ban_expires: banExpires
        });
        
        await logAdminAction('ban_user', user.username, `Бан${durationHours ? ` на ${durationHours} ч.` : ' навсегда'}: ${reason}`);
        
    } catch (error) {
        console.error('Error banning user:', error);
    }
}

async function unbanUser(userId) {
    try {
        const user = users.find(u => u.id === userId);
        if (!user) return;
        
        if (user.banned_ip) {
            await unbanIP(user.banned_ip);
        }
        
        await updateUser(userId, { 
            banned: false, 
            ban_reason: null,
            ban_expires: null,
            banned_ip: null
        });
        
        await logAdminAction('unban_user', user.username, 'Разбан');
        
    } catch (error) {
        console.error('Error unbanning user:', error);
    }
}

window.unbanIP = async function(ip) {
    if (confirm('Разбанить IP? Это разблокирует все аккаунты с этим IP.')) {
        await unbanIP(ip);
        alert('IP разбанен');
        renderAdminPanel();
    }
};

async function unbanIP(ip) {
    try {
        const { error } = await supabase
            .from('banned_ips')
            .delete()
            .eq('ip_address', ip);
        
        if (error) throw error;
        
        await loadBannedIPs();
        return true;
    } catch (error) {
        console.error('Error unbanning IP:', error);
        return false;
    }
}

async function publishBanner(message) {
    try {
        await supabase
            .from('banners')
            .update({ 
                is_active: false,
                deactivated_at: new Date()
            })
            .eq('is_active', true);
        
        const { data } = await supabase
            .from('banners')
            .insert([{
                message: message,
                is_active: true,
                created_by: currentUser?.username,
                activated_at: new Date()
            }])
            .select();
        
        if (data && data.length > 0) {
            await logAdminAction('publish_banner', null, 'Опубликован баннер: ' + message);
            alert('Баннер опубликован!');
            renderAdminPanel();
        }
    } catch (error) {
        console.error('Error publishing banner:', error);
    }
}

async function getBannerHistory() {
    try {
        const { data } = await supabase
            .from('banners')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(20);
        
        return data || [];
    } catch (error) {
        return [];
    }
}

async function logAdminAction(action, target, details) {
    try {
        await supabase
            .from('admin_logs')
            .insert([{
                admin_username: currentUser?.username,
                action: action,
                target_user: target,
                details: details
            }]);
    } catch (error) {
        console.error('Error logging:', error);
    }
}

document.addEventListener('DOMContentLoaded', () => {
    const checkInterval = setInterval(() => {
        if (typeof supabase !== 'undefined' && supabase !== null && users.length > 0) {
            clearInterval(checkInterval);
            renderAdminPanel();
        }
    }, 100);
});
