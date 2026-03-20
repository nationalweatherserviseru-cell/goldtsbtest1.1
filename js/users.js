function searchUser() {
    const nick = document.getElementById('searchUsername').value.trim();
    const resultDiv = document.getElementById('searchResult');
    
    if (!nick) return;
    
    if (nick === 'Gold_TSB') {
        resultDiv.innerHTML = `
            <div class="profile-card">
                <h3><i class="fas fa-crown" style="color: #ff8c00;"></i> Gold_TSB</h3>
                <p><span class="admin-badge"><i class="fas fa-gavel"></i></span></p>
                <p><strong>Роль:</strong> <span style="color: #ff8c00;">Администратор</span></p>
                <p><a href="/profile.html?id=gold-tsb-admin" class="btn-secondary" style="display: inline-block; margin-top: 10px;">Открыть профиль</a></p>
            </div>
        `;
        return;
    }
    
    const user = users.find(u => u.roblox_nick === nick);
    if (!user) {
        resultDiv.innerHTML = `<p style="color: #ff8c00;"><i class="fas fa-exclamation-circle"></i> Пользователь не найден</p>`;
    } else {
        let statusHtml = '';
        if (user.banned) {
            statusHtml = `<p><span class="banned-badge"><i class="fas fa-ban"></i> Пользователь заблокирован</span></p>`;
        } else {
            const verifiedBadge = user.verified ? '<span class="verified-badge"><i class="fas fa-check-circle"></i>Аккаунт подтвержден</span>' : '';
            const killBadgeClass = user.verified ? 'kill-badge' : 'kill-badge unverified';
            const killText = user.verified ? 
                `Киллы: ${user.kills.toLocaleString()}` : 
                `Киллы: ${user.kills.toLocaleString()} (не подтверждены)`;
            
            statusHtml = `
                <p><span class="${killBadgeClass}"><i class="fas fa-skull"></i> ${killText}</span></p>
                ${verifiedBadge}
            `;
        }
        
        resultDiv.innerHTML = `
            <div class="profile-card">
                <h3>
                    ${escapeHtml(user.roblox_nick)}
                    ${user.role === 'admin' ? '<span class="admin-badge"><i class="fas fa-gavel"></i></span>' : ''}
                </h3>
                ${user.bio ? `<p style="color: #b0b0b0; font-style: italic;">"${escapeHtml(user.bio)}"</p>` : ''}
                <p><i class="fas fa-link" style="color: #ff8c00;"></i> <a href="${user.profile_url}" target="_blank">Профиль Roblox</a></p>
                ${statusHtml}
                <p><strong>Роль:</strong> <span style="color: #ff8c00;">${user.role === 'admin' ? 'Администратор' : 'Игрок'}</span></p>
                <p><small>Аккаунт создан ${user.created_at ? formatDate(user.created_at) : 'Неизвестно'}</small></p>
                ${!user.verified && !user.banned ? '<p class="unverified-text"><i class="fas fa-clock"></i> Ожидает подтверждения</p>' : ''}
                <a href="/profile.html?id=${user.id}" class="btn-secondary" style="display: inline-block; margin-top: 10px;">Открыть профиль</a>
            </div>
        `;
    }
}

document.addEventListener('DOMContentLoaded', () => {
    const checkInterval = setInterval(() => {
        if (typeof supabase !== 'undefined' && supabase !== null && users.length > 0) {
            clearInterval(checkInterval);
            document.getElementById('searchUserBtn')?.addEventListener('click', searchUser);
            document.getElementById('searchUsername')?.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') searchUser();
            });
        }
    }, 100);
});
