# 休息提醒移动应用（Capacitor 起步版）

本项目把原有 Streamlit 休息提醒的核心交互迁移到独立前端，便于打包为 Android / iOS 应用。计时器运行在本机，不依赖 Codespaces 服务器；Streamlit 网页可以继续保留，未来再通过 API 同步设置或统计。

## 目录结构

```text
rest-reminder-mobile/
├── index.html
├── package.json
├── capacitor.config.json
├── www/
│   ├── main.js
│   └── style.css
├── README.md
└── docs/
    └── streamlit-integration.md
```

安装依赖后，Capacitor 会生成 `android/` 和 `ios/` 原生工程；这两个目录不是手写的初始文件。

## 环境要求

- Node.js 22 或更新版本
- Android：Android Studio 与 Android SDK
- iOS：macOS、Xcode 与 CocoaPods。仅使用 Windows/Codespaces 无法在本机完成 iOS 原生构建；可以把项目推到 GitHub 后，在 Mac 或 macOS CI 环境构建。

## 第一次运行

在该目录终端执行：

```bash
npm install
npm run build
npx cap add android
npx cap add ios
npx cap sync
```

如果当前机器没有相应原生工具链，可以先只执行 `npm install` 和 `npm run start` 预览网页版本。

## 本地预览

```bash
npm run start
```

终端会显示 Vite 本地地址。浏览器打开后可以测试时长设置、开始、暂停、继续、重置和前台声音提示。

## Android

```bash
npm run build
npx cap sync android
npx cap open android
```

在 Android Studio 选择模拟器或连接设备后运行。构建 APK：Android Studio 菜单 Build → Build Bundle(s) / APK(s) → Build APK(s)。发布 Google Play 通常使用签名 AAB，并需完成商店的隐私、安全和测试要求。

## iOS

在 Mac 上执行：

```bash
npm run build
npx cap sync ios
npx cap open ios
```

在 Xcode 中选择签名团队和模拟器/设备，运行或通过 Archive 导出。向 App Store 发布需要 Apple Developer 账号及相应审核流程。

## 当前实现范围与注意事项

- 开始、暂停、继续、重置和 1–180 分钟时长设置。
- 前台结束时声音提示；原生平台尝试安排本地通知。
- 本地存储记住上次设置。
- 计时使用结束时间戳，而不是依赖 interval 累加，因此从后台返回时会重新校准显示。
- 操作系统限制后台执行；本项目使用原生本地通知做后台提醒，但仍需在真机上验证权限、锁屏、勿扰/专注模式和省电行为。
- 通知声音由操作系统管理，不能保证在静音模式下播放。
- `smallIcon` 使用 Capacitor 示例资源名；若构建后 Android 通知图标缺失，请在 Android 原生资源中添加自定义单色通知图标，或移除该项并使用平台默认配置。
- 本起步版尚未把 Streamlit 的数据接入 App，也未实现账户、云端同步或统计。
