# Tasks
- [x] Task 1: 配置与安全整理：新增三层审核所需 env 配置，确保密钥不进入可提交文件。
  - [x] SubTask 1.1: 在服务端配置模块加入 AI 审核、外部过滤 API、审核超时和屏蔽文案配置。
  - [x] SubTask 1.2: 更新 `.env.example` 使用占位符，不写入真实密钥或 token。
  - [x] SubTask 1.3: 将真实密钥仅写入本地 `.env`，并在提交前检查未被跟踪。

- [x] Task 2: 实现后端三层审核服务：按 AI、外部过滤 API、本地词库顺序检测并自动降级。
  - [x] SubTask 2.1: 封装 AI 审核调用，使用 OpenAI 兼容接口和模型配置，返回是否敏感。
  - [x] SubTask 2.2: 封装敏感文本过滤 API 调用，比较返回文本是否被替换为星号。
  - [x] SubTask 2.3: 复用现有本地词库作为第三层 fallback。
  - [x] SubTask 2.4: 对超时、异常、配置缺失和不可解析响应执行降级，不阻断业务请求。

- [x] Task 3: 接入异步审核队列：发送后再审核，命中后自动屏蔽。
  - [x] SubTask 3.1: 新增内存队列或轻量后台任务执行器，避免同步阻塞用户发送。
  - [x] SubTask 3.2: 在消息发送成功后加入审核任务，保留消息已发送行为。
  - [x] SubTask 3.3: 审核命中后更新消息内容和屏蔽状态，并通过 Socket 通知客户端。
  - [x] SubTask 3.4: 按现有内容创建入口决定是否接入朋友圈和公众号内容审核，避免破坏现有流程。

- [x] Task 4: 前端展示与登录页更新：展示特殊屏蔽气泡并说明本次更新。
  - [x] SubTask 4.1: 消息气泡识别屏蔽状态或屏蔽文案，显示特殊样式。
  - [x] SubTask 4.2: 监听后端审核更新事件，更新当前会话中的消息展示。
  - [x] SubTask 4.3: 登录页以美观卡片展示本次三层异步审核更新内容。

- [ ] Task 5: 验证、构建与发布：完成检查后推送到远程仓库。
  - [ ] SubTask 5.1: 运行后端模块加载或相关脚本验证。
  - [ ] SubTask 5.2: 运行前端构建。
  - [ ] SubTask 5.3: 检查 Git 状态，确认 `.env`、AI Key、API token 未进入提交。
  - [ ] SubTask 5.4: 以“大重构”为提交信息提交并推送到远程 Git 仓库。

# Task Dependencies
- Task 2 depends on Task 1.
- Task 3 depends on Task 2.
- Task 4 can run after Task 3 defines消息屏蔽字段或事件格式。
- Task 5 depends on Tasks 1-4.
