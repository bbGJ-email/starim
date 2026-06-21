# 三层异步敏感内容审核 Spec

## Why
当前敏感词过滤依赖本地词库，难以结合上下文精准识别规避表达，也可能在同步发送链路中影响消息发送体验。需要改为后端异步队列审核，并按 AI、外部过滤 API、本地词库三层降级执行。

## What Changes
- 新增后端敏感内容审核队列：消息先发送成功，再异步检查内容。
- 新增三层审核策略：第一层 OpenAI 兼容 AI 审核，第二层敏感文本过滤 API，第三层本地词库。
- 当上层服务不可用或超时时自动降级到下一层。
- 审核命中后自动替换已发送内容为“检测到敏感内容，已自动屏蔽”，并通过特殊气泡样式展示。
- 登录页展示本次更新内容。
- 前端构建并将本次更新提交推送到远程 Git 仓库，提交信息为“大重构”。
- 安全要求：API Key、token 等敏感配置只允许写入 env，不写入源码、规格文档或可提交文件。

## Impact
- Affected specs: 消息发送、朋友圈/公众号内容过滤、敏感词过滤、安全配置、登录页公告、Git 发布流程。
- Affected code: 后端消息/内容创建接口、敏感词工具、审核队列服务、环境配置、Socket 推送、前端消息气泡、登录页、构建配置。

## ADDED Requirements
### Requirement: 三层敏感内容审核
The system SHALL provide a three-level content moderation strategy in backend services.

#### Scenario: AI 审核可用
- **WHEN** 用户发送消息或提交需要审核的内容
- **THEN** 后端队列优先调用 AI 审核服务并根据上下文判断是否敏感

#### Scenario: AI 服务不可用
- **WHEN** AI 服务超时、异常、返回不可解析或配置缺失
- **THEN** 系统自动降级到敏感文本过滤 API

#### Scenario: 外部过滤 API 不可用
- **WHEN** 第二层 API 超时、异常或配置缺失
- **THEN** 系统自动降级到本地词库检查

### Requirement: 异步非阻塞审核
The system SHALL run all moderation checks in backend queue after content has been sent or created.

#### Scenario: 用户发送消息
- **WHEN** 用户发送消息
- **THEN** 消息应立即进入正常发送流程，不等待三层审核完成

#### Scenario: 审核结果命中敏感内容
- **WHEN** 队列审核判定内容敏感
- **THEN** 后端自动替换该内容为“检测到敏感内容，已自动屏蔽”，并通知相关客户端刷新或更新该消息

### Requirement: 特殊气泡展示
The client SHALL display blocked sensitive messages with a distinct bubble style.

#### Scenario: 已屏蔽消息展示
- **WHEN** 前端收到被屏蔽的消息内容或屏蔽状态
- **THEN** 使用特殊气泡样式展示“检测到敏感内容，已自动屏蔽”

### Requirement: 登录页更新说明
The client SHALL show a polished update notice on the login page.

#### Scenario: 用户打开登录页
- **WHEN** 用户访问登录页
- **THEN** 页面展示本次“三层异步敏感内容审核”等更新内容

### Requirement: 发布与构建
The project SHALL be built and pushed to the configured remote repository after implementation.

#### Scenario: 更新完成
- **WHEN** 代码实现与验证完成
- **THEN** 构建前端，并以“大重构”为提交信息推送到远程 Git 仓库

## MODIFIED Requirements
### Requirement: 内容过滤覆盖范围
The system SHALL keep existing local dictionary filtering capability, but use it as the third-level fallback in the new asynchronous moderation pipeline.

### Requirement: 敏感配置管理
The system SHALL load AI endpoint, AI key, AI model, external filter API endpoint, and external filter API token from environment variables only.

## REMOVED Requirements
### Requirement: 同步阻塞式敏感词过滤
**Reason**: 同步过滤会影响用户发送体验，并且无法满足三层降级策略。
**Migration**: 改为后端队列异步审核，命中后自动替换已发送内容并通知前端更新。
