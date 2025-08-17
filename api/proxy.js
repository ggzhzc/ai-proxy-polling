<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <title>API 密钥管理</title>
    <style>
        :root {
            --primary-color: #4A90E2;
            --success-bg: #E8F5E9;
            --success-text: #2E7D32;
            --error-bg: #FBEAEA;
            --error-text: #C62828;
            --border-color: #E0E0E0;
            --shadow-light: rgba(0, 0, 0, 0.05);
        }

        body {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
            background-color: #F8F9FA;
            color: #333;
            display: flex;
            justify-content: center;
            align-items: center;
            min-height: 100vh;
            margin: 0;
            opacity: 0; /* 初始隐藏，防止闪烁 */
            transition: opacity 0.5s;
        }

        .container {
            background-color: #fff;
            padding: 40px;
            border-radius: 12px;
            box-shadow: 0 4px 12px var(--shadow-light);
            width: 100%;
            max-width: 450px;
            text-align: center;
            box-sizing: border-box;
        }
        
        h1 {
            color: #2C3E50;
            font-size: 24px;
            margin-bottom: 30px;
        }

        p {
            color: #777;
            margin-top: 0;
            margin-bottom: 20px;
        }

        input, textarea, select {
            width: 100%;
            padding: 12px;
            margin-top: 8px;
            margin-bottom: 20px;
            box-sizing: border-box;
            border: 1px solid var(--border-color);
            border-radius: 8px;
            font-size: 16px;
        }

        textarea {
            resize: vertical;
        }

        button {
            width: 100%;
            padding: 12px;
            border: none;
            border-radius: 8px;
            background-color: var(--primary-color);
            color: #fff;
            font-size: 16px;
            font-weight: bold;
            cursor: pointer;
            transition: background-color 0.2s;
        }

        button:hover {
            background-color: #3a75b6;
        }

        .hidden {
            display: none;
        }
        
        .key-entry {
            display: flex;
            gap: 10px;
            margin-bottom: 10px;
        }

        .key-entry input, .key-entry select {
            margin: 0;
        }

        .key-entry button {
            width: auto;
            background-color: #E74C3C;
        }
        
        #add-key-btn {
            background-color: #2ECC71;
            margin-top: 15px;
        }

        #status {
            margin-top: 20px;
            padding: 12px;
            border-radius: 8px;
            font-weight: bold;
            font-size: 14px;
        }

        .success {
            background-color: var(--success-bg);
            color: var(--success-text);
        }

        .error {
            background-color: var(--error-bg);
            color: var(--error-text);
        }
    </style>
</head>
<body style="opacity: 0;">
    <div class="container">
        <h1>API 密钥管理</h1>

        <div id="login-form" class="hidden">
            <p>请输入管理密码：</p>
            <input type="password" id="password" placeholder="管理密码">
            <button onclick="login()">登录</button>
        </div>

        <div id="manage-panel" class="hidden">
            <p>管理你的 API 密钥 (每个密钥和平台为一个条目):</p>
            <div id="api-keys-container"></div>
            <button id="add-key-btn" onclick="addKeyField()">添加新密钥</button>
            <button onclick="updateKeys()">更新密钥</button>
        </div>

        <div id="status"></div>
    </div>

    <script>
        const statusDiv = document.getElementById('status');
        const loginForm = document.getElementById('login-form');
        const managePanel = document.getElementById('manage-panel');
        const keysContainer = document.getElementById('api-keys-container');

        const platforms = ['openai', 'anthropic', 'google', 'llama', 'baichuan', 'iflytek', 'zhipuai', 'wenxinyiyan', 'kimi', 'siliconflow', 'azure-openai'];

        function addKeyField(key = '', platform = 'openai') {
            const entryDiv = document.createElement('div');
            entryDiv.className = 'key-entry';
            entryDiv.innerHTML = `
                <select>
                    ${platforms.map(p => `<option value="${p}" ${p === platform ? 'selected' : ''}>${p}</option>`).join('')}
                </select>
                <input type="text" placeholder="输入 API 密钥" value="${key}">
                <button onclick="this.parentNode.remove()">移除</button>
            `;
            keysContainer.appendChild(entryDiv);
        }

        function getKeysFromFields() {
            const keys = [];
            document.querySelectorAll('.key-entry').forEach(entry => {
                const platform = entry.querySelector('select').value;
                const key = entry.querySelector('input').value.trim();
                if (key) {
                    keys.push({ platform, key });
                }
            });
            return keys;
        }

        async function login() {
            const password = document.getElementById('password').value;
            if (!password) {
                showStatus('请输入密码。', 'error');
                return;
            }
            
            try {
                const response = await fetch('/api/keys', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ password: password })
                });

                if (response.ok) {
                    const savedKeys = await response.json();
                    loginForm.classList.add('hidden');
                    managePanel.classList.remove('hidden');
                    keysContainer.innerHTML = '';
                    if (savedKeys && savedKeys.length > 0) {
                        savedKeys.forEach(item => addKeyField(item.key, item.platform));
                    } else {
                        addKeyField();
                    }
                    showStatus('登录成功！', 'success');
                    localStorage.setItem('adminPassword', password);
                    localStorage.setItem('loginTimestamp', Date.now());
                } else {
                    const error = await response.json();
                    throw new Error(error.error);
                }
            } catch (error) {
                showStatus('登录失败：' + error.message, 'error');
            }
        }
        
        async function updateKeys() {
            const keys = getKeysFromFields();
            const password = localStorage.getItem('adminPassword');
            const timestamp = localStorage.getItem('loginTimestamp');

            if (!password || !timestamp) {
                showStatus('请先登录。', 'error');
                return;
            }

            const oneHourInMs = 60 * 60 * 1000;
            if (Date.now() - timestamp > oneHourInMs) {
                showStatus('会话已过期，请重新登录。', 'error');
                localStorage.removeItem('adminPassword');
                localStorage.removeItem('loginTimestamp');
                setTimeout(() => window.location.reload(), 1500);
                return;
            }
            
            try {
                const response = await fetch('/api/manage', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        password: password,
                        keys: keys
                    })
                });
                
                const data = await response.json();
                if (response.ok) {
                    showStatus('密钥已成功更新！', 'success');
                } else {
                    throw new Error(data.error);
                }
            } catch (error) {
                showStatus('更新失败：' + error.message, 'error');
            }
        }
        
        function showStatus(message, type) {
            statusDiv.textContent = message;
            statusDiv.className = '';
            statusDiv.classList.add('status', type);
        }

        // 新增：页面加载时检查 localStorage 中是否有密码且未过期
        (async function checkLoginState() {
            const password = localStorage.getItem('adminPassword');
            const timestamp = localStorage.getItem('loginTimestamp');
            
            if (password && timestamp) {
                const oneHourInMs = 60 * 60 * 1000;
                if (Date.now() - timestamp <= oneHourInMs) {
                    try {
                        const response = await fetch('/api/keys', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ password: password })
                        });
                        if (response.ok) {
                            const savedKeys = await response.json();
                            loginForm.classList.add('hidden');
                            managePanel.classList.remove('hidden');
                            if (savedKeys && savedKeys.length > 0) {
                                savedKeys.forEach(item => addKeyField(item.key, item.platform));
                            } else {
                                addKeyField();
                            }
                            showStatus('已自动登录', 'success');
                            document.body.style.opacity = '1';
                            return;
                        }
                    } catch (error) {
                        console.error('Auto login failed:', error);
                    }
                }
            }

            // 如果上述条件不满足，显示登录表单
            loginForm.classList.remove('hidden');
            document.body.style.opacity = '1';
        })();
    </script>
</body>
</html>
