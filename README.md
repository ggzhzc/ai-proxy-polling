fork项目，vercel平台部署，环境变量名ADMIN_PASSWORD 填写的值是你的登陆密码。

在vercel主页点击Storag创建Upstash选择Upstash for Redis这个，然后进入创建好的Upstash for Redis绑定到你部署的这个vercel项目

第三方ai工具使用方法：统一调用链接https://<your vercel domain>/api/proxy，apikey填写项目生成的统一代理 API，模型谁便填，最终调用模型取决于在部署项目上填写的真正模型。
