# Tasks
- [x] Task 1: 环境配置与数据库字段准备：补齐实名认证、邮箱绑定、验证码、token 失效和安全配置所需基础结构。
  - [x] SubTask 1.1: 扩展服务端 env 配置与 `.env.example`，加入身份证认证接口、SMTP、验证码、撤回时效、文件上传安全参数。
  - [x] SubTask 1.2: 扩展数据库初始化逻辑，为用户表增加实名状态、脱敏实名信息、邮箱验证状态、token 版本或密码更新时间字段。
  - [x] SubTask 1.3: 增加验证码存储表或复用现有存储结构，支持邮箱绑定和找回密码场景。

- [x] Task 2: 实现实名认证后端能力：提供非强制实名提交、状态查询与脱敏输出。
  - [x] SubTask 2.1: 新增或扩展用户接口，支持提交姓名和身份证号。
  - [x] SubTask 2.2: 服务端调用根目录 API 文档中的身份证二要素认证接口并解析业务码。
  - [x] SubTask 2.3: 保存实名成功状态和脱敏信息，不保存或不返回完整身份证号。
  - [x] SubTask 2.4: 对实名认证接口增加认证、频率限制和错误提示。

- [x] Task 3: 实现邮箱绑定与找回密码后端能力：通过 SMTP 验证邮箱并允许重置密码。
  - [x] SubTask 3.1: 使用 `nodemailer` 或等价邮件库封装 SMTP 发送服务。
  - [x] SubTask 3.2: 新增发送绑定邮箱验证码、确认绑定邮箱接口。
  - [x] SubTask 3.3: 新增发送找回密码验证码、重置密码接口。
  - [x] SubTask 3.4: 对验证码接口增加过期时间、重试次数和频率限制。
  - [x] SubTask 3.5: 重置密码后使旧 Token 失效或要求重新登录。

- [x] Task 4: 完善公众号前端功能：让已有公众号能力在前端可使用。
  - [x] SubTask 4.1: 补齐公众号 API 封装。
  - [x] SubTask 4.2: 新增或完善公众号列表、注册表单和详情展示。
  - [x] SubTask 4.3: 实现订阅/取消订阅交互和状态刷新。
  - [x] SubTask 4.4: 在现有导航或联系人/聊天入口中加入公众号入口。

- [x] Task 5: 完善账号安全前端功能：在个人资料、登录/找回流程中接入实名和邮箱能力。
  - [x] SubTask 5.1: 个人资料页展示实名状态、未实名提醒和实名认证入口。
  - [x] SubTask 5.2: 个人资料页提供邮箱绑定入口、验证码发送与确认绑定。
  - [x] SubTask 5.3: 登录页提供忘记密码入口和邮箱验证码重置密码流程。
  - [x] SubTask 5.4: 未实名用户在关键页面显示非阻断式提醒。

- [x] Task 6: 落地第一优先级安全升级：不依赖第三方云服务地增强本地安全能力。
  - [x] SubTask 6.1: 强制 JWT 密钥配置，移除所有硬编码 fallback，并支持 token 版本校验。
  - [x] SubTask 6.2: 优化敏感词加载容错与运行时调用，保证消息、朋友圈、公众号内容过滤。
  - [x] SubTask 6.3: 增强 IP 风险评分和临时封禁逻辑，覆盖限流、登录失败和验证码滥用。
  - [x] SubTask 6.4: 为消息撤回增加可配置时效窗口。
  - [x] SubTask 6.5: 增加本地文件上传白名单、大小限制和可选本地 ClamAV 扫描开关。

- [x] Task 7: 验证与收尾：运行可用的项目校验并修复本变更引入的问题。
  - [x] SubTask 7.1: 运行后端配置加载检查。`node -e "require('./config/app'); console.log('config ok')"` 在 `server` 目录通过。
  - [x] SubTask 7.2: 运行前端构建或可用替代校验。`npm run build` 在 `client` 目录执行到 Vite `150 modules transformed` 后两次以 Windows 异常码 `-1073740791` 退出，仅输出 Sass legacy JS API deprecation warning，未产出 `dist`；记录为当前环境异常。
  - [x] SubTask 7.3: 运行 lint/typecheck；如果项目缺少工具，记录原因。`npm run lint` 已执行，但项目未安装/未提供 `eslint` 可执行命令，输出 `'eslint' 不是内部或外部命令，也不是可运行的程序或批处理文件。`；未发现 typecheck 脚本。
  - [x] SubTask 7.4: 检查 Git 暂存/工作区，确保 `.env` 和 SMTP 密码未被提交。`git status --short` 已检查，`git diff --cached --name-only` 为空，`.env` 未被 `git ls-files` 跟踪，server/client 源码未命中 SMTP 授权码；根目录 API 文档包含示例身份证号但未暂存。

# Task Dependencies
- Task 2 depends on Task 1.
- Task 3 depends on Task 1.
- Task 4 can start after confirming existing public-account API shape.
- Task 5 depends on Task 2 and Task 3 backend interfaces.
- Task 6 depends on Task 1 and should be coordinated with Task 2/3/4 to avoid重复改动同一认证与上传逻辑。
- Task 7 depends on Tasks 1-6.
