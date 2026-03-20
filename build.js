const fs = require('fs');
const path = require('path');

// Создаем папку js если её нет
const jsDir = path.join(__dirname, 'js');
if (!fs.existsSync(jsDir)) {
    fs.mkdirSync(jsDir);
}

// Создаем config.js с переменными окружения
const configContent = `// Автоматически сгенерированный файл
const SUPABASE_CONFIG = {
    url: '${process.env.SUPABASE_URL}',
    anonKey: '${process.env.SUPABASE_ANON_KEY}'
};
`;

fs.writeFileSync(path.join(jsDir, 'config.js'), configContent);
console.log('✅ config.js created successfully!');
