# 小熊英语游戏 · Bear's English Playtime

给小朋友的 Unit 1 英语学习站：跟着小熊听、做、说，按**单元 → 章节 → 阶段**一步步学。纯静态、无构建，双击 `index.html` 就能开始；托管到 HTTPS 后还可安装到主屏幕、离线学习。

## 现在包含什么

- **Unit 1「动作与表达」**，5 个章节，每章 3 个阶段：
  1. Hello, Bear! — 自我介绍
  2. Move & Play — 动作词
  3. I Can! — I can 句型
  4. More Moves — 新动作
  5. I Can Do More! — 新 I can 句型
- 每章固定 3 颗星（按完成阶段发放，不看正确率）；5 枚章节徽章、16 枚动作贴纸、Showtime 皇冠。
- 活动：听+做、听音找图、句子找图、感觉脸配对、家长带答、跟读录音回放。
- 面向还不认识汉字的 3 岁 George：主要学习入口和选项用小熊动作、表情、图标与已有录音引导；中文仍保留给家长。名字示范显示“My name is George.”，原录音只到“My name is …”，名字需要家长在停顿处接上；年龄与男孩回答沿用现有录音。
- 儿童尺寸的大卡片：章节地图、快捷卡、选项、表情、动作贴纸和徽章都按“看得清、点得准”放大；16 个动作采用统一姿势，重点动作带手指、手掌或接触提示。
- 单元级 Showtime 与 Playground（跨章节自由玩、混合挑战）。
- 62 段英文录音全部沿用初版素材，没有外部 TTS，也没有把完整句剪成单词。
- 中文家长提示、慢速 0.75×、静音、音效开关、减弱动画、浅色/深色/跟随系统。
- 进度、贴纸和设置保存在本机 `localStorage`；不登录、不上传、无排行榜和广告。
- 录音默认关闭；首次使用需家长同意，只存在内存中，离开跟读页面即释放麦克风和录音。
- 可安装 PWA；外壳与音频版本化缓存，更新由家长确认，不在学习中强制刷新。

## 快速预览

在项目根目录运行任意静态服务器：

```powershell
python -m http.server 8080 --bind 127.0.0.1
```

打开 <http://127.0.0.1:8080/>。

也可以直接双击 `index.html`（`file://`）。核心学习、音频和进度可用；PWA 安装、离线缓存和部分浏览器的录音能力需要 HTTPS 或 localhost。麦克风不可用时，跟读页会退化为“只听不说”，不阻塞流程。

家长入口在首页右上角「家长」：先答一道算术题，每次打开网站验证一次。

## 部署

这是无构建站点，把以下文件/目录原样上传到 GitHub Pages、Netlify、Cloudflare Pages 或任意静态空间即可：

```
index.html  manifest.webmanifest  sw.js
css/  data/  js/  assets/
```

建议**不要上传**：

- `.tmp/`：本地测试脚本、截图和 Playwright 依赖。
- `node_modules/`、`package.json`、`package-lock.json`、`tests/`：仅用于开发期自动化测试，站点运行不依赖它们。
- `archive/`：初版单文件原型与留档说明，只作内容与音频来源，不参与新站导航。
- `.claude/`、`.git/`：本地配置和版本历史，不应上传。
- `tools/`：可选的开发/校验脚本，不影响站点运行。

所有路径都是相对路径，可部署在域名根目录，也可放在子目录（如 `https://example.com/bear/`）。Service Worker 的默认作用域是 `sw.js` 所在目录；子目录部署时它只能控制该子目录，这是浏览器规则，属正常现象。

**发布前检查清单**

1. 修改任何已发布文件后，同时更新 `sw.js` 顶部的 `VERSION`（例如 `1.0.1`），让旧缓存失效；需要时也更新 `js/main.js` 的 `APP_VERSION`（家长面板「关于」显示）。
2. 运行内容校验：`node tools/check-content.mjs`（需要 Node 18+；时长检查需要 `ffprobe`）。
3. 若新增/替换音频，重新生成 `assets/audio/unit1/` 并同步 `data/audio.js`。
4. 在 HTTPS 环境确认 Service Worker 已激活、断网可重载；升级后家长面板应出现「有新版本，更新并重启」。
5. 真机（尤其 iPhone Safari）验证首次音频解锁、来电/锁屏中断、录音权限和返回后的清理。

## 新增单元 / 章节

内容与界面分离；加章节或加同构单元不需要改游戏代码。加入第二个单元时，还需要在首页补一个单元切换入口（数据、路由和进度已经按多单元设计）。

**新增单元**（以 Unit 2 为例）：

1. 新建 `data/units/unit2.js`，按 `data/units/unit1.js` 的结构导出 `BEAR_UNITS.unit2`；活动类型沿用 `doIt`、`findIt`、`faceMatch`、`introChat`、`sayIt`。
2. 在 `data/units/index.js` 注册单元顺序。
3. 在 `index.html` 的 `data/units/unit1.js` 之后加一行 `<script defer src="data/units/unit2.js"></script>`。
4. 在 `data/audio.js` 增加逻辑 key → 相对路径；音频文件放到 `assets/audio/unit2/`。
5. 在 `sw.js` 的 `SHELL_FILES` 加上新数据文件，并更新 `VERSION`。
6. 运行 `node tools/check-content.mjs`；如音频总数不再是 62，调整工具顶部的 `EXPECTED_AUDIO_KEYS`。

**新增章节**：在对应单元的 `chapters` 数组追加一章，保持 3 个 `phases`，引用已有 `items` 和 `phrases` 即可；徽章、星星、贴纸、Showtime 解锁会自动适配。新增章节也需要更新 `sw.js` 的数据文件缓存（数据文件本身已在壳层清单中）和版本号。

内容校验器会检查：

- 所有 item、chapter、activity 引用的 id 是否存在；
- 所有音频 key 是否在 `data/audio.js` 中、文件是否存在且时长有效；
- 徽章图标、熊的 `pose` / `face` 名称是否在 `js/icons.js`、`js/bear.js` 中存在；
- `index.html` 引用的文件和 manifest 图标是否齐全。

## 音频与素材

- `assets/audio/unit1/*.mp3` 共 62 段，来自初版 `archive/original-unit1.html` 的 `const AU` 内嵌数据。
- 重新提取（只解析 base64，不执行原 HTML）：

  ```powershell
  node tools/extract-audio.mjs --out .tmp/extract-check
  ```

  默认输出到 `assets/audio/unit1/`。建议先输出到临时目录，与现有文件比对后再覆盖。
- 英文字体 Fredoka Latin 以 SIL OFL 授权，已以 data URI 内嵌进 `css/tokens.css`，保证 `file://` 下也能显示；`assets/fonts/` 保留原始字体文件和 `OFL.txt` 作为来源与许可记录。
- 图标、小熊插画、章节地图均为站内内联 SVG，不依赖 emoji、图标 CDN 或 Google Fonts。

## 隐私说明

- 没有账号、云同步、排行榜、金币、广告或第三方分析。
- 学习进度、设置、徽章和贴纸只写入当前浏览器的 `localStorage`（键名 `bearEnglish.state`）；清理站点数据会一并清除。
- 录音需要家长在设置或首次录音弹层中明确同意；默认关闭。
- 录音使用 `MediaRecorder` 存在页面内存中，生成的对象 URL 在删除/重录/离开页面时撤销；不上传、不自动录音、不做语音识别或打分。
- 离开跟读页面、切换路由、页面隐藏或关闭时，会停止播放并释放麦克风。

## 目录结构

```
index.html                 入口
manifest.webmanifest       PWA 清单
sw.js                      离线外壳/音频缓存
css/                       设计 tokens、基础样式、组件、小熊与屏幕样式
data/audio.js              音频 key → 文件路径
data/units/unit1.js        Unit 1 全部内容数据
data/units/index.js        单元注册表
js/                        路由、音频、录音、存储、UI、图标、小熊
js/games/                  五种活动模板
js/screens/                首页、章节、游乐场、贴纸册、家长
assets/audio/unit1/        62 段 MP3
assets/icons/              favicon 与 PWA 图标
assets/fonts/              字体源文件与 OFL 许可
tools/check-content.mjs    内容/音频/图标静态校验
tools/extract-audio.mjs    从初版 HTML 重提音频
tests/smoke.mjs            浏览器冒烟测试（可选依赖）
archive/original-unit1.html 初版单文件原型（留档，不部署）
archive/README.md          留档说明与校验和
.gitignore                 忽略依赖、临时文件和本地配置
.gitattributes             文本换行与二进制文件规则
```

## 版本管理

仓库只跟踪站点源码、素材、测试、工具和留档原型。以下内容不会进入版本库：

- `node_modules/`、`.tmp/`：依赖、测试脚本和截图。
- `.claude/settings.local.json`：本机的 Claude Code 权限配置。
- `.DS_Store`、`Thumbs.db`、`*.log`：系统或运行日志。

提交前建议至少运行 `node tools/check-content.mjs`；改动交互或布局时再跑 `npm test`。初版 HTML 保持在 `archive/`，需要追溯内容或音频来源时直接查看该文件。

## 开发与测试

站点本身不需要安装依赖。可选地装开发依赖后，可以运行浏览器冒烟测试（会使用系统 Chrome，不会下载浏览器）：

```powershell
npm install
npm test
```

如果 Chrome 不在默认位置，或想复用已有的 `playwright-core`：

```powershell
$env:CHROME_PATH = "C:\Program Files\Google\Chrome\Application\chrome.exe"
$env:PLAYWRIGHT_CORE = "C:\path\to\playwright-core\index.mjs"
npm test
```

测试覆盖首页与五章地图、横向溢出、320px 宽下 George 自我介绍的首屏开始按钮与示范卡、Find It“再听一次”的 `again` 提示音、完整章节的 3 星与 9 枚贴纸结算、`file://` 冒烟，以及 Service Worker 离线重载和离线音频。内容静态校验单独运行：

```powershell
npm run check
```

开发约定：

- 不使用打包器、框架、`fetch()` 读 JSON 或 ES Module；脚本用经典 `<script defer>`，保证 `file://` 可运行。
- Hash 路由：`#/`、`#/unit/unit1`、`#/unit/unit1/chapter/<id>`、`#/unit/unit1/showtime`、`#/unit/unit1/playground`、`#/unit/unit1/stickers`、`#/parent`。
- 屏幕接口：`BEAR.screens[name].render(host, ctx) → cleanup`；游戏接口：`BEAR.games[type](host, opts) → { destroy }`。
- 进入新路由前先销毁旧屏幕：停止语音、终止录音、清定时器、撤销 object URL。
- 儿童可点目标不小于 64×64 px，主按钮 72 px 高；文案中文，英文目标词/句单独 `lang="en"`。
- 修改后至少跑一次 `npm run check` 和 `npm test`，并在 320×568、390×844、横屏和深色模式下过一遍主要屏幕。

## 已知限制

- Showtime 解锁条件为完成 5 章；`a_age` 录音固定为“3 岁”，当前与 George 的年龄相符，年龄变化后需家长自行示范。
- `snap` 对 3 岁孩子偏难，内容中已注明“看和试就好”，不要求成功。
- `file://` 下无法注册 Service Worker，也不能安装 PWA；录音能否使用取决于浏览器，UI 会自动降级。
- 320×568 等很短小的屏幕、以及手机横屏时，部分长页面需要纵向滚动才能看到底部主按钮；内容不会被横向裁切，主按钮也可正常点击。手机横屏的「听音找图」会把提示和选项并排，「表情配对」会把提示与开始按钮放在顶部、五张脸排成一行，尽量把选项留在首屏。
- 当前只有 Unit 1；数据、路由和进度结构已按多单元设计，但首页的单元切换入口要等第二个单元加入时再补。
