let currentProfileUser = null;

async function loadProfile() {
    const urlParams = new URLSearchParams(window.location.search);
    const userId = urlParams.get('id');
    
    if (!userId) {
        document.getElementById('profileContent').innerHTML = `
            <div class="panel">
                <div class="error-box">
                    <i class="fas fa-exclamation-triangle" style="font-size: 2rem;"></i>
                    <p>Пользователь не указан</p>
                </div>
            </div>
        `;
        return;
    }
    
    // Ждем загрузки users
    const checkInterval = setInterval(() => {
        if (users.length > 0 || typeof supabase !== 'undefined') {
            clearInterval(checkInterval);
            const user = users.find(u => u.id === userId);
            if (user) {
                currentProfileUser = user;
                renderProfile(user);
            } else {
                document.getElementById('profileContent').innerHTML = `
                    <div class="panel">
                        <div class="error-box">
                            <i class="fas fa-exclamation-triangle" style="font-size: 2rem;"></i>
                            <p>Пользователь не найден</p>
                        </div>
                    </div>
                `;
            }
        }
    }, 100);
}

function renderProfile(user) {
    const container = document.getElementById('profileContent');
    
    let verifiedStatus = '';
    if (user.banned) {
        verifiedStatus = `<span class="banned-status"><i class="fas fa-ban"></i> Пользователь заблокирован</span>`;
    } else {
        verifiedStatus = user.verified 
            ? '<span class="verified-status"><i class="fas fa-check-circle"></i> Аккаунт подтвержден</span>' 
            : '<span class="unverified-status"><i class="fas fa-clock"></i> Ожидает подтверждения</span>';
    }
    
    const isOwnProfile = currentUser && (currentUser.id === user.id);
    const isAdmin = currentUser?.role === 'admin';
    
    const createdDate = user.created_at ? formatDate(user.created_at) : 'Неизвестно';
    
    let nickCooldownInfo = '';
    if (isOwnProfile && user.last_nick_change) {
        const lastChange = new Date(user.last_nick_change);
        const now = new Date();
        const diff = now - lastChange;
        if (diff < NICK_CHANGE_COOLDOWN) {
            const daysLeft = Math.ceil((NICK_CHANGE_COOLDOWN - diff) / (24 * 60 * 60 * 1000));
            nickCooldownInfo = `<div class="cooldown-info">Ник можно будет сменить через ${daysLeft} дн.</div>`;
        }
    }
    
    container.innerHTML = `
        <div class="profile-page">
            <div class="profile-header">
                <div class="profile-avatar">
                    <i class="fas fa-user"></i>
                </div>
                <div class="profile-info">
                    <h2>
                        ${escapeHtml(user.roblox_nick)}
                        ${user.role === 'admin' && !user.banned ? '<span class="admin-badge"><i class="fas fa-gavel"></i></span>' : ''}
                    </h2>
                    ${user.bio ? `<div class="bio">"${escapeHtml(user.bio)}"</div>` : ''}
                    ${verifiedStatus}
                    <div class="created-date">Аккаунт создан ${createdDate}</div>
                </div>
            </div>
            
            ${!user.banned ? `
                <div class="profile-stats">
                    <div class="stat-box">
                        <div class="label">КИЛЛЫ</div>
                        <div class="value">${user.kills.toLocaleString()}</div>
                        ${!user.verified && !user.banned ? '<div style="color: #ff8888; font-size: 0.85rem;">(не подтверждены)</div>' : ''}
                    </div>
                    <div class="stat-box">
                        <div class="label">РОБЛОКС ПРОФИЛЬ</div>
                        <div class="value" style="font-size: 1rem;"><a href="${user.profile_url}" target="_blank">Перейти <i class="fas fa-external-link-alt"></i></a></div>
                    </div>
                </div>
            ` : ''}
            
            ${isOwnProfile && !user.banned ? `
                <div class="profile-actions">
                    <button class="btn-primary" onclick="toggleEditProfile()"><i class="fas fa-edit"></i> РЕДАКТИРОВАТЬ ПРОФИЛЬ</button>
                </div>
                
                <div id="editProfileSection" class="update-profile-section hidden">
                    <h3>ИЗМЕНИТЬ ОПИСАНИЕ</h3>
                    <textarea id="bioInput" class="input-group" placeholder="Расскажите о себе...">${escapeHtml(user.bio || '')}</textarea>
                    <button class="btn-primary" onclick="updateBio()">СОХРАНИТЬ ОПИСАНИЕ</button>
                    
                    <hr style="margin: 20px 0;">
                    
                    <h3>ИЗМЕНИТЬ НИК</h3>
                    <input type="text" id="newNickname" class="input-group" placeholder="Новый ник в Roblox" value="${escapeHtml(user.roblox_nick)}">
                    ${nickCooldownInfo}
                    <button class="btn-primary" onclick="updateNickname()">СМЕНИТЬ НИК</button>
                    <div id="updateProfileResult"></div>
                </div>
            ` : ''}
            
            ${isAdmin && !isOwnProfile && !user.banned ? `
                <div class="profile-actions" style="margin-top: 20px;">
                    <div style="width: 100%;">
                        <h3><i class="fas fa-gavel"></i> АДМИНИСТРИРОВАНИЕ</h3>
                        <div class="ban-controls">
                            <select id="banDuration" class="ban-duration">
                                <option value="1">1 час</option>
                                <option value="6">6 часов</option>
                                <option value="12">12 часов</option>
                                <option value="24">1 день</option>
                                <option value="72">3 дня</option>
                                <option value="168">7 дней</option>
                                <option value="720">30 дней</option>
                                <option value="0">Навсегда</option>
                            </select>
                            <input type="text" id="banReason" class="ban-reason" placeholder="Причина бана">
                            <button class="ban-button" onclick="adminBanUser('${user.id}')">
                                <i class="fas fa-ban"></i> Забанить
                            </button>
                            <button class="ban-button" style="background: #ff6600;" onclick="adminBanUserWithIP('${user.id}')">
                                <i class="fas fa-globe"></i> Забанить с IP
                            </button>
                            <button class="btn-secondary" onclick="adminVerify('${user.id}')">Подтвердить</button>
                            ${currentUser?.username === 'Gold_TSB' ? `
                                <button class="btn-secondary" onclick="adminMakeAdmin('${user.id}')">Сделать админом</button>
                            ` : ''}
                        </div>
                    </div>
                </div>
            ` : ''}
            
            ${isAdmin && !isOwnProfile && user.banned ? `
                <div class="profile-actions" style="margin-top: 20px;">
                    <button class="btn-secondary" onclick="adminUnbanUser('${user.id}')">
                        <i class="fas fa-check"></i> Разбанить
                    </button>
                </div>
            ` : ''}
        </div>
    `;
}

window.toggleEditProfile = function() {
    const section = document.getElementById('editProfileSection');
    if (section) {
        section.classList.toggle('hidden');
    }
};

window.updateBio = async function() {
    if (!currentUser) return;
    
    const newBio = document.getElementById('bioInput')?.value;
    
    const result = await updateProfile(currentUser.id, { bio: newBio });
    
    if (result.success) {
        alert('Описание обновлено!');
        location.reload();
    } else {
        alert(result.error);
    }
};

window.updateNickname = async function() {
    if (!currentUser) return;
    
    const newNick = document.getElementById('newNickname')?.value;
    
    if (!newNick) {
        alert('Введите новый ник');
        return;
    }

    const existingUser = users.find(u => u.roblox_nick === newNick && u.id !== currentUser.id);
    if (existingUser) {
        alert('Этот ник уже занят');
        return;
    }

    if (currentUser.last_nick_change) {
        const lastChange = new Date(currentUser.last_nick_change);
        const now = new Date();
        const diff = now - lastChange;
        
        if (diff < NICK_CHANGE_COOLDOWN) {
            const daysLeft = Math.ceil((NICK_CHANGE_COOLDOWN - diff) / (24 * 60 * 60 * 1000));
            alert(`Ник можно менять раз в неделю. Осталось ${daysLeft} дн.`);
            return;
        }
    }

    const result = await updateProfile(currentUser.id, { 
        roblox_nick: newNick,
        last_nick_change: new Date().toISOString()
    });
    
    if (result.success) {
        alert('Ник успешно изменен!');
        location.reload();
    } else {
        alert(result.error);
    }
};

async function updateProfile(userId, updates) {
    try {
        const { error } = await supabase
            .from('users')
            .update(updates)
            .eq('id', userId);
        
        if (error) throw error;
        
        await loadUsers();
        
        if (currentUser && currentUser.id === userId) {
            const updatedUser = users.find(u => u.id === userId);
            if (updatedUser) {
                currentUser = updatedUser;
                localStorage.setItem('gold_tsb_session', JSON.stringify({ username: currentUser.username, loginTime: new Date().toISOString() }));
            }
        }
        
        return { success: true };
    } catch (error) {
        console.error('Error updating profile:', error);
        return { error: 'Ошибка при обновлении профиля' };
    }
}

window.adminBanUser = async function(userId) {
    const duration = document.getElementById('banDuration')?.value || '24';
    const reason = document.getElementById('banReason')?.value;
    
    if (!reason) {
        alert('Введите причину бана');
        return;
    }
    
    const useIPBan = confirm('Забанить также по IP? Это заблокирует все аккаунты с этим IP.');
    const durationHours = parseInt(duration) === 0 ? null : parseInt(duration);
    
    if (useIPBan) {
        await banUserWithIP(userId, reason, durationHours);
    } else {
        await banUser(userId, reason, durationHours);
    }
    
    alert('Пользователь забанен');
    location.reload();
};

window.adminBanUserWithIP = async function(userId) {
    const duration = document.getElementById('banDuration')?.value || '24';
    const reason = document.getElementById('banReason')?.value;
    
    if (!reason) {
        alert('Введите причину бана');
        return;
    }
    
    const durationHours = parseInt(duration) === 0 ? null : parseInt(duration);
    await banUserWithIP(userId, reason, durationHours);
    
    alert('Пользователь забанен с IP');
    location.reload();
};

window.adminUnbanUser = async function(userId) {
    if (confirm('Разбанить пользователя?')) {
        await unbanUser(userId);
        alert('Пользователь разбанен');
        location.reload();
    }
};

window.adminVerify = async function(userId) {
    await updateUser(userId, { verified: true });
    alert('Киллы подтверждены');
    location.reload();
};

window.adminMakeAdmin = async function(userId) {
    if (currentUser?.username !== 'Gold_TSB') {
        alert('Только Gold_TSB может выдавать права администратора');
        return;
    }
    await updateUser(userId, { role: 'admin' });
    alert('Права администратора выданы');
    location.reload();
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

async function banUserWithIP(userId, reason, durationHours = null) {
    try {
        const user = users.find(u => u.id === userId);
        if (!user) return;
        
        const userIP = user.ip || '0.0.0.0';
        
        await banIP(userIP, currentUser?.username, reason, durationHours);
        
        const banExpires = durationHours ? new Date(Date.now() + durationHours * 60 * 60 * 1000) : null;
        
        await updateUser(userId, { 
            banned: true, 
            ban_reason: reason,
            ban_expires: banExpires,
            banned_ip: userIP
        });
        
        const durationText = durationHours ? ` на ${durationHours} ч.` : ' навсегда';
        await logAdminAction('ban_user', user.username, `Бан по IP${durationText}: ${reason}`);
        
    } catch (error) {
        console.error('Error banning user with IP:', error);
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

async function banIP(ip, bannedBy, reason, durationHours = null) {
    try {
        const banExpires = durationHours ? new Date(Date.now() + durationHours * 60 * 60 * 1000) : null;
        
        const { error } = await supabase
            .from('banned_ips')
            .insert([{
                ip_address: ip,
                banned_by: bannedBy,
                reason: reason,
                ban_expires: banExpires
            }]);
        
        if (error) throw error;
        
        const usersWithIP = users.filter(u => u.ip === ip && u.username !== 'Gold_TSB');
        for (const user of usersWithIP) {
            await updateUser(user.id, { 
                banned: true, 
                ban_reason: reason,
                ban_expires: banExpires,
                banned_ip: ip
            });
        }
        
        await loadBannedIPs();
        await loadUsers();
    } catch (error) {
        console.error('Error banning IP:', error);
    }
}

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
            loadProfile();
        }
    }, 100);
});
