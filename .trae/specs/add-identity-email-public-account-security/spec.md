# 实名认证、邮箱找回、公众号完善与安全升级 Spec

## Why
当前项目已经具备基础 IM、社交、管理和安全能力，但缺少实名提示、邮箱找回密码、完整公众号前端入口，以及第一优先级安全升级的落地实现。该变更用于增强账号可信度、账号恢复能力、公众号体验和生产安全性，同时不强制实名、不依赖第三方云安全服务。

## What Changes
- 添加非强制实名认证能力：用户可提交姓名和身份证号，由服务端调用根目录《身份证二要素认证API文档.md》中的接口完成核验；未实名用户在关键位置展示提醒但不阻止使用。
- 添加实名认证状态字段、脱敏展示和核验记录，避免前端或普通接口暴露完整身份证号。
- 完善前端公众号功能：公众号注册、展示、资料页、订阅/取消订阅、公众号消息或内容入口。
- 添加邮箱绑定功能：用户可绑定邮箱，通过 SMTP 发送验证码完成验证。
- 添加邮箱找回密码：已绑定邮箱的用户可请求验证码并重置密码。
- 将 SMTP 配置放入环境变量，不把邮箱密码写入源码或提交到仓库。
- 完成第一优先级安全升级方案中不依赖第三方云服务的部分：JWT 密钥强制配置与轮换准备、敏感词加载优化、IP 封禁增强、消息撤回时效、文件上传本地安全校验。
- 不接入第三方云服务；实名认证接口按用户提供文档调用，文件安全扫描采用本地校验或可选本地 ClamAV。

## Impact
- Affected specs: 账号体系、用户资料、认证与找回密码、公众号、消息系统、安全中间件、文件上传、敏感词过滤。
- Affected code: `server/config/app.js`, `server/models/User.js`, `server/models/db.js`, `server/routes/*`, `server/controllers/*`, `server/middlewares/*`, `server/utils/*`, `server/socket/handlers.js`, `client/src/api/*`, `client/src/stores/*`, `client/src/views/*`, `client/src/components/*`, `.env.example`。

## ADDED Requirements

### Requirement: 非强制实名认证
The system SHALL allow logged-in users to submit real name and 18-digit ID card number for two-factor identity verification without making verification mandatory for normal app usage.

#### Scenario: 用户提交匹配信息
- **WHEN** 已登录用户提交姓名和身份证号
- **THEN** 服务端调用身份证二要素认证接口
- **AND** 当 `showapi_res_code=0` 且 `showapi_res_body.code=0` 时，将用户标记为已实名
- **AND** 返回脱敏后的实名状态、性别、生日和地区信息

#### Scenario: 用户提交不匹配信息
- **WHEN** 接口返回 `code=1` 或 `code=2`
- **THEN** 系统不标记实名
- **AND** 返回可理解的失败原因

#### Scenario: 未实名提醒
- **WHEN** 未实名用户进入个人资料、聊天首页或执行高信任操作
- **THEN** 前端展示非阻断式实名提醒
- **AND** 用户仍可继续使用基础功能

#### Scenario: 实名信息保护
- **WHEN** 查询用户资料或管理员列表
- **THEN** 系统不得返回完整身份证号
- **AND** 只返回实名状态与脱敏信息

### Requirement: 公众号前端完善
The system SHALL provide a usable frontend flow for public account registration, listing, details, subscription management, and public-account content/message entry.

#### Scenario: 注册公众号
- **WHEN** 用户填写公众号名称、介绍、头像并提交
- **THEN** 前端调用已有公众号注册接口
- **AND** 成功后显示公众号资料页或列表更新

#### Scenario: 浏览公众号
- **WHEN** 用户进入公众号页面
- **THEN** 显示公众号列表、头像、名称、简介、订阅状态

#### Scenario: 订阅与取消订阅
- **WHEN** 用户点击订阅或取消订阅
- **THEN** 系统更新订阅关系并刷新状态

### Requirement: 邮箱绑定
The system SHALL allow logged-in users to bind an email address after verifying an email code sent through configured SMTP.

#### Scenario: 发送绑定验证码
- **WHEN** 已登录用户输入合法邮箱并请求验证码
- **THEN** 服务端通过 SMTP `smtp.126.com:465` 发送验证码
- **AND** 验证码有过期时间和频率限制

#### Scenario: 完成邮箱绑定
- **WHEN** 用户提交邮箱和正确验证码
- **THEN** 系统将邮箱绑定到当前账号并标记邮箱已验证

### Requirement: 邮箱找回密码
The system SHALL allow users with verified bound emails to reset their password using email verification.

#### Scenario: 请求找回密码验证码
- **WHEN** 用户输入已绑定邮箱
- **THEN** 系统发送找回密码验证码
- **AND** 不泄露该邮箱是否存在的敏感细节

#### Scenario: 重置密码
- **WHEN** 用户提交邮箱、正确验证码和新密码
- **THEN** 系统使用 bcrypt 保存新密码
- **AND** 使该用户旧 Token 失效或要求重新登录

### Requirement: JWT 安全增强
The system SHALL require strong JWT configuration and prepare for token invalidation/rotation without hard-coded fallback secrets.

#### Scenario: 缺少 JWT 密钥
- **WHEN** 服务启动时缺少 `JWT_SECRET`
- **THEN** 服务拒绝启动并输出明确错误

#### Scenario: 密码重置后旧 Token 处理
- **WHEN** 用户通过邮箱找回密码成功
- **THEN** 系统更新用户 token 版本或密码更新时间
- **AND** 旧 Token 不应继续通过敏感接口认证

### Requirement: 敏感词加载优化
The system SHALL load and use the local sensitive lexicon without blocking normal request handling for excessive time.

#### Scenario: 词库加载失败
- **WHEN** 某个词库文件缺失或加载失败
- **THEN** 系统记录错误并继续加载其他词库

#### Scenario: 运行时过滤
- **WHEN** 用户发送消息、朋友圈或公众号内容
- **THEN** 系统过滤或拒绝敏感内容，保持现有安全行为

### Requirement: IP 封禁增强
The system SHALL improve local IP abuse protection without relying on third-party cloud security services.

#### Scenario: 异常请求行为
- **WHEN** 同一 IP 在短时间内多次触发限流、登录失败或验证码请求
- **THEN** 系统提高风险分数或临时封禁该 IP

#### Scenario: 封禁过期
- **WHEN** 临时封禁时间到期
- **THEN** 系统自动解除封禁

### Requirement: 消息撤回时效
The system SHALL limit message recall to a configurable time window.

#### Scenario: 时效内撤回
- **WHEN** 发送者在允许时间内撤回自己的消息
- **THEN** 系统撤回成功并通知相关会话成员

#### Scenario: 超时撤回
- **WHEN** 发送者超过允许时间撤回消息
- **THEN** 系统拒绝撤回并返回明确提示

### Requirement: 本地文件上传安全校验
The system SHALL validate uploaded files locally without depending on third-party cloud services.

#### Scenario: 文件类型不允许
- **WHEN** 用户上传扩展名或 MIME 类型不在白名单内的文件
- **THEN** 系统拒绝上传

#### Scenario: 文件过大
- **WHEN** 上传文件超过配置大小
- **THEN** 系统拒绝上传

#### Scenario: 可选本地病毒扫描
- **WHEN** 环境启用本地 ClamAV 扫描且服务可用
- **THEN** 上传文件需通过扫描后才保存

## MODIFIED Requirements

### Requirement: 用户资料
The system SHALL include email binding status and real-name verification status in user profile responses while protecting sensitive fields from leakage.

### Requirement: 认证与密码安全
The system SHALL support password reset through verified email and ensure passwords are always stored using bcrypt hashing.

### Requirement: 消息系统
The system SHALL enforce a recall time window and continue to sanitize/filter message content before persistence and broadcast.

### Requirement: 公众号功能
The system SHALL expose existing public-account backend capability through complete frontend pages and API wrappers.

## REMOVED Requirements
无。
