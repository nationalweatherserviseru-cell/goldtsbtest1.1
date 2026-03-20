let createPostVisible = false;

// Рендер форума
function renderForum() {
    const container = document.getElementById('forumContent');
    if (!container) return;
    
    const canCreatePost = currentUser && !currentUser.banned;
    const now = Date.now();
    const timeSinceLastPost = now - lastPostTime;
    const onCooldown = timeSinceLastPost < POST_COOLDOWN && currentUser?.role !== 'admin';
    
    let cooldownText = '';
    if (onCooldown && currentUser) {
        const minutesLeft = Math.ceil((POST_COOLDOWN - timeSinceLastPost) / 60000);
        cooldownText = `<span class="cooldown-timer">(подождите ${minutesLeft} мин.)</span>`;
    }

    let postsHtml = '';
    if (forumPosts.length === 0) {
        postsHtml = `
            <div class="empty-forum">
                <i class="fas fa-comments"></i>
                <p>На форуме пока нет сообщений</p>
                <p style="color: #666; font-size: 0.9rem;">Будьте первым, кто создаст тему!</p>
            </div>
        `;
    } else {
        forumPosts.forEach(post => {
            const postDate = new Date(post.created_at).toLocaleString('ru-RU');
            const isAdminPost = post.is_admin_post ? 'admin-post' : '';
            
            let linksHtml = '';
            if (post.links && post.links.length > 0) {
                linksHtml = `
                    <div class="post-links">
                        <strong>Ссылки:</strong><br>
                        ${post.links.map(link => `<a href="${link}" target="_blank">${link}</a>`).join('')}
                    </div>
                `;
            }

            let deleteButton = '';
            if (currentUser?.role === 'admin') {
                deleteButton = `
                    <button class="delete-post" onclick="deletePost('${post.id}')">
                        <i class="fas fa-trash"></i> Удалить
                    </button>
                `;
            }

            const commentsHtml = renderComments(post);

            postsHtml += `
                <div class="forum-post ${isAdminPost}">
                    <div class="post-header">
                        <div class="post-author">
                            <div class="author-avatar" onclick="location.href='/profile.html?id=${post.user_id}'">
                                <i class="fas fa-user"></i>
                            </div>
                            <div class="author-info">
                                <h4 onclick="location.href='/profile.html?id=${post.user_id}'">
                                    ${post.roblox_nick || post.username}
                                    ${post.is_admin_post ? '<span class="admin-badge"><i class="fas fa-gavel"></i></span>' : ''}
                                </h4>
                                <div class="post-date">${postDate}</div>
                            </div>
                        </div>
                        <div class="post-actions">
                            ${deleteButton}
                        </div>
                    </div>
                    <div class="post-title">${escapeHtml(post.title)}</div>
                    <div class="post-content">${escapeHtml(post.content).replace(/\n/g, '<br>')}</div>
                    ${linksHtml}
                    ${commentsHtml}
                </div>
            `;
        });
    }

    container.innerHTML = `
        <div class="forum-container">
            <div class="forum-header">
                <div>
                    <h2><i class="fas fa-comments"></i> ФОРУМ</h2>
                    <div class="forum-stats">
                        Всего тем: <span>${forumPosts.length}</span>
                    </div>
                </div>
                ${canCreatePost ? `
                    <button class="forum-create-btn" onclick="toggleCreatePost()" ${onCooldown ? 'disabled' : ''}>
                        <i class="fas fa-plus"></i> СОЗДАТЬ ТЕМУ
                    </button>
                    ${cooldownText}
                ` : ''}
            </div>

            <div id="createPostPanel" class="forum-create-panel hidden">
                <h3><i class="fas fa-edit"></i> НОВАЯ ТЕМА</h3>
                <input type="text" id="postTitle" placeholder="Заголовок темы">
                <textarea id="postContent" placeholder="Текст сообщения..."></textarea>
                <input type="text" id="postLinks" placeholder="Ссылки через запятую (необязательно)">
                <button class="btn-primary" onclick="submitPost()">ОПУБЛИКОВАТЬ</button>
                <button class="btn-secondary" onclick="toggleCreatePost()" style="margin-left: 10px;">ОТМЕНА</button>
            </div>

            <div class="forum-posts">
                ${postsHtml}
            </div>
        </div>
    `;
}

function renderComments(post) {
    const comments = post.comments || [];
    
    let commentsHtml = '';
    comments.forEach(comment => {
        const commentDate = new Date(comment.created_at).toLocaleString('ru-RU');
        
        let deleteButton = '';
        if (currentUser?.role === 'admin') {
            deleteButton = `
                <button class="comment-delete" onclick="deleteComment('${post.id}', '${comment.id}')">
                    <i class="fas fa-trash"></i> Удалить
                </button>
            `;
        }

        const adminBadge = comment.is_admin ? '<span class="admin-badge"><i class="fas fa-gavel"></i></span>' : '';

        commentsHtml += `
            <div class="comment">
                <div class="comment-header">
                    <span class="comment-author" onclick="location.href='/profile.html?id=${comment.user_id}'">
                        ${escapeHtml(comment.roblox_nick)}
                        ${adminBadge}
                    </span>
                    <span class="comment-date">${commentDate}</span>
                </div>
                <div class="comment-content">${escapeHtml(comment.content).replace(/\n/g, '<br>')}</div>
                ${deleteButton ? `<div class="comment-actions">${deleteButton}</div>` : ''}
            </div>
        `;
    });

    const canComment = currentUser && !currentUser.banned;

    return `
        <div class="comments-section">
            <div class="comments-title">
                <i class="fas fa-comments"></i> Комментарии (${comments.length})
            </div>
            
            ${commentsHtml || '<p style="color: #888;">Пока нет комментариев</p>'}

            ${canComment ? `
                <div class="add-comment">
                    <textarea id="comment-${post.id}" placeholder="Напишите комментарий..."></textarea>
                    <button onclick="submitComment('${post.id}')">
                        <i class="fas fa-paper-plane"></i> Отправить
                    </button>
                </div>
            ` : ''}
        </div>
    `;
}

function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

window.toggleCreatePost = function() {
    const panel = document.getElementById('createPostPanel');
    if (panel) {
        panel.classList.toggle('hidden');
    }
};

window.submitPost = async function() {
    const title = document.getElementById('postTitle')?.value;
    const content = document.getElementById('postContent')?.value;
    const linksInput = document.getElementById('postLinks')?.value;
    
    if (!title || !content) {
        alert('Заполните заголовок и текст сообщения');
        return;
    }

    let links = [];
    if (linksInput) {
        links = linksInput.split(',').map(l => l.trim()).filter(l => l);
    }

    const success = await createForumPost(title, content, links);
    
    if (success) {
        toggleCreatePost();
        document.getElementById('postTitle').value = '';
        document.getElementById('postContent').value = '';
        document.getElementById('postLinks').value = '';
        renderForum();
    }
};

async function createForumPost(title, content, links) {
    if (!currentUser) {
        alert('Необходимо войти в аккаунт');
        return false;
    }

    const now = Date.now();
    const timeSinceLastPost = now - lastPostTime;
    
    if (timeSinceLastPost < POST_COOLDOWN && currentUser.role !== 'admin') {
        const minutesLeft = Math.ceil((POST_COOLDOWN - timeSinceLastPost) / 60000);
        alert(`Подождите ${minutesLeft} минут перед созданием нового поста`);
        return false;
    }

    try {
        const newPost = {
            id: Date.now().toString(),
            user_id: currentUser.id,
            username: currentUser.username,
            roblox_nick: currentUser.roblox_nick,
            title: title,
            content: content,
            links: links || [],
            created_at: new Date().toISOString(),
            is_admin_post: currentUser.role === 'admin',
            comments: []
        };

        const { error } = await supabase
            .from('forum_posts')
            .insert([newPost]);

        if (error) throw error;

        forumPosts.unshift(newPost);
        lastPostTime = now;
        
        return true;
    } catch (error) {
        console.error('Error creating post:', error);
        alert('Ошибка при создании поста');
        return false;
    }
}

window.deletePost = async function(postId) {
    if (!confirm('Вы уверены, что хотите удалить этот пост?')) return;
    
    if (!currentUser || currentUser.role !== 'admin') {
        alert('Только администраторы могут удалять посты');
        return;
    }

    try {
        const { error } = await supabase
            .from('forum_posts')
            .delete()
            .eq('id', postId);

        if (error) throw error;

        forumPosts = forumPosts.filter(p => p.id !== postId);
        renderForum();
    } catch (error) {
        console.error('Error deleting post:', error);
        alert('Ошибка при удалении поста');
    }
};

window.submitComment = async function(postId) {
    const textarea = document.getElementById(`comment-${postId}`);
    if (!textarea) return;
    
    const commentText = textarea.value;
    
    if (!currentUser) {
        alert('Необходимо войти в аккаунт');
        return;
    }

    if (!commentText.trim()) {
        alert('Введите текст комментария');
        return;
    }

    try {
        const post = forumPosts.find(p => p.id === postId);
        if (!post) return;

        const comments = post.comments || [];
        const isAdmin = currentUser.role === 'admin';
        
        const newComment = {
            id: Date.now().toString(),
            user_id: currentUser.id,
            username: currentUser.username,
            roblox_nick: currentUser.roblox_nick,
            content: commentText,
            created_at: new Date().toISOString(),
            is_admin: isAdmin
        };

        comments.push(newComment);

        const { error } = await supabase
            .from('forum_posts')
            .update({ comments: comments })
            .eq('id', postId);

        if (error) throw error;

        post.comments = comments;
        textarea.value = '';
        renderForum();
    } catch (error) {
        console.error('Error adding comment:', error);
        alert('Ошибка при добавлении комментария');
    }
};

window.deleteComment = async function(postId, commentId) {
    if (!confirm('Удалить комментарий?')) return;
    
    if (!currentUser || currentUser.role !== 'admin') {
        alert('Только администраторы могут удалять комментарии');
        return;
    }

    try {
        const post = forumPosts.find(p => p.id === postId);
        if (!post) return;

        const comments = (post.comments || []).filter(c => c.id !== commentId);

        const { error } = await supabase
            .from('forum_posts')
            .update({ comments: comments })
            .eq('id', postId);

        if (error) throw error;

        post.comments = comments;
        renderForum();
    } catch (error) {
        console.error('Error deleting comment:', error);
        alert('Ошибка при удалении комментария');
    }
};

// Загрузка форума при загрузке страницы
document.addEventListener('DOMContentLoaded', () => {
    // Ждем инициализации main.js
    const checkInterval = setInterval(() => {
        if (typeof supabase !== 'undefined' && supabase !== null) {
            clearInterval(checkInterval);
            renderForum();
        }
    }, 100);
});
