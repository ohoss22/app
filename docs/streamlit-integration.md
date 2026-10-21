# 与现有 Streamlit 项目的整合建议

## 建议保留两套入口

1. `reminderweb_mobile.py`：保留当前 Streamlit 网页，适合桌面浏览器和快速试验。
2. `rest-reminder-mobile/`：独立 Capacitor App，计时和提醒由设备本地完成。

不要把 `http://localhost:8501` 写进 App 配置：手机上的 localhost 指向手机本身，不是 Codespaces。也不建议将 Codespaces 临时公开地址作为长期生产 API，因为开发环境可能休眠、地址/服务可用性可能变化。

## 如果以后需要同步

可以把 Streamlit 保留为展示层，另外用 FastAPI/Flask 提供稳定 API，例如：

- `GET /api/settings`：读取用户偏好
- `PUT /api/settings`：保存默认时长、声音偏好
- `POST /api/sessions`：记录一次计时完成

App 在联网时同步数据；计时器和本地通知不应依赖 API 在线。API 应使用 HTTPS、输入校验和适当的身份验证，不要把密钥写进前端代码。
