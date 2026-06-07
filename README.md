# 抖音选品广场数据爬取工具

基于 Playwright 的抖音电商（巨量百应）选品广场自动化数据爬取工具，支持列表视图和卡片视图，可自动应用页面筛选条件并进行数据后处理过滤，还能一键为所有符合条件的商品点击"加选品车"。

## 功能特性

- **双视图支持**：列表视图（table）和卡片视图（grid）
- **页面筛选**：自动操作页面 UI 筛选器（月销、佣金、体验分、好评率、服务权益）
- **数据后处理**：按标签、收益等条件过滤数据
- **自动滚动加载**：智能检测新数据，自动滚动加载更多商品
- **商品链接提取**：通过 React fiber 提取商品 ID，构造商品详情页 URL
- **自动加选品车**：符合条件商品一键自动加入选品车，支持弹窗自动确认
- **CSV 导出**：自动输出 UTF-8 BOM 编码的 CSV 文件，Excel 直接打开无乱码
- **灵活配置**：支持配置文件 + CLI 参数覆盖

## 前置条件

1. 安装 Node.js（建议 v16+）
2. 安装 Playwright CLI 工具：
   ```bash
   npm install -g @playwright/cli
   ```
3. 抖音电商（巨量百应）账号：https://buyin.jinritemai.com

## 快速开始

### 第一步：登录

首次使用或登录过期时，运行登录脚本：

```bash
./login.sh
```

脚本会打开浏览器，请按以下步骤操作：
1. 在浏览器中登录抖音电商
2. 进入"选品广场"页面
3. 确认页面正常加载后，回到终端按回车键

登录状态会保存到 `.auth-state.json`，后续爬取会自动使用。

### 第二步：运行爬取脚本

```bash
# 使用默认配置运行（爬取50条，表格视图，标签过滤）
./run.sh

# 爬取100条
./run.sh -n 100

# 卡片视图 + 按标签过滤
./run.sh -m grid -t "高结算率"

# 启用页面筛选器
./run.sh --ui-filter -n 50

# 启用页面筛选器 + 自动加选品车
./run.sh --ui-filter -a -n 50

# 自定义输出文件名
./run.sh -n 30 -o my_products

# 查看帮助
./run.sh -h
```

## CLI 参数

| 参数 | 说明 | 默认值 |
|------|------|--------|
| `-n, --count <数量>` | 目标爬取数量 | 50 |
| `-m, --mode <table\|grid>` | 视图模式 | table |
| `-s, --scroll <次数>` | 最大滚动次数 | 20 |
| `-f, --filter` | 启用数据后处理过滤 | true |
| `-F, --no-filter` | 禁用数据后处理过滤 | - |
| `--ui-filter` | 启用页面 UI 筛选器 | false |
| `--no-ui-filter` | 禁用页面 UI 筛选器 | - |
| `-a, --add-to-cart` | 自动点击符合条件商品的"加选品车"按钮 | false |
| `--no-add-to-cart` | 禁用"加选品车"功能 | - |
| `-t, --tags <标签1,标签2>` | 标签过滤，逗号分隔（OR关系） | 商家投千川,高结算率 |
| `-o, --output <名称>` | 输出文件名前缀（不含扩展名） | products_时间戳 |
| `--no-csv` | 不生成 CSV 文件 | - |
| `-h, --help` | 显示帮助信息 | - |

CLI 参数会覆盖 `config.json` 中的对应配置项。

## 配置文件

编辑 `config.json` 修改默认配置：

```json
{
  "TARGET_COUNT": 50,
  "VIEW_MODE": "table",
  "MAX_SCROLL": 20,
  "APPLY_UI_FILTERS": false,
  "POST_FILTER": true,
  "ADD_TO_CART": false,
  "FILTER": {
    "tagsInclude": ["商家投千川", "高结算率"],
    "monthlySalesMin": 0,
    "commissionMin": 0,
    "shopScoreMin": 0,
    "goodReviewMin": 0,
    "shortVideoPush": false
  }
}
```

### 配置项详解

| 配置项 | 类型 | 默认值 | 说明 |
|--------|------|--------|------|
| `TARGET_COUNT` | number | 50 | 目标爬取商品数量，过滤后不足会继续滚动加载 |
| `VIEW_MODE` | string | `table` | `table` 列表视图 / `grid` 卡片视图 |
| `MAX_SCROLL` | number | 20 | 页面最大滚动次数，防止无限滚动 |
| `APPLY_UI_FILTERS` | boolean | false | 是否自动点击页面筛选器 |
| `POST_FILTER` | boolean | true | 是否对爬取结果进行后处理过滤 |
| `ADD_TO_CART` | boolean | false | 爬取完成后是否自动点击符合条件商品的"加选品车"按钮 |

### UI 筛选配置（APPLY_UI_FILTERS = true 时生效）

| 配置项 | 说明 |
|--------|------|
| `monthlySalesMin` | 月销量最小值，>0 时筛选 "≥1000" |
| `commissionMin` | 佣金下限，设置后筛选 "10%-20%" |
| `shopScoreMin` | 商家体验分最低分，>0 时筛选 "90 分以上" |
| `goodReviewMin` | 好评率最低值，>0 时筛选 "≥90%" |
| `shortVideoPush` | 是否筛选 "短视频随心推" |

## 使用示例

### 基础爬取

```bash
# 默认配置：50条、表格视图、标签过滤
./run.sh

# 只要标签包含"高结算率"的商品
./run.sh -t "高结算率"

# 多个标签（OR关系）
./run.sh -t "商家投千川,高结算率,低价好卖"
```

### 切换视图

```bash
# 卡片视图
./run.sh -m grid

# 卡片视图 + 不过滤
./run.sh -m grid -F
```

### 启用页面筛选器

```bash
# 启用页面筛选（使用config.json中的筛选条件）
./run.sh --ui-filter

# 启用页面筛选 + 爬取100条
./run.sh --ui-filter -n 100
```

### 自动加选品车

```bash
# 筛选后自动为所有符合条件商品点击"加选品车"
./run.sh --ui-filter -a -n 20

# 不加筛选器，直接对当前页面商品加选品车
./run.sh -a -n 10
```

### 自定义输出

```bash
# 指定输出文件名前缀
./run.sh -o "夏季选品"

# 不生成CSV，只要JSON
./run.sh --no-csv
```

## 输出

每次运行自动生成两个文件到 `data/` 目录：

- `data/{名称}_{时间戳}.json` — 原始 JSON 数据
- `data/{名称}_{时间戳}.csv` — CSV 表格（UTF-8 BOM 编码）

### CSV 字段

| 字段 | 说明 | 示例 |
|------|------|------|
| `index` | 序号 | 1 |
| `title` | 商品标题 | 【4+4】心相印抽纸巾家庭装... |
| `tags` | 标签（\| 分隔） | 商家投千川\|运费险\|现货 |
| `shopName` | 店铺名称 | 心相印旷向专卖店 |
| `shopScore` | 店铺评分 | 98分 |
| `productUrl` | 商品链接 | https://buyin.jinritemai.com/dashboard/product/detail?product_id=... |
| `price` | 到手价 | 2.6 |
| `commissionRate` | 佣金比例 | 5% |
| `commissionType` | 佣金类型 | 双佣金 / 团长 / 佣金 |
| `estimatedEarning` | 预估收益 | 0.1 |
| `investmentCommission` | 投放期佣金 | 5% |
| `goodReviewRate` | 好评率 | 94.63% |
| `sellerCount` | 带货达人数 | 512 |
| `salesVolume` | 销量 | 339 |
| `monthlySales` | 月销量 | （部分商品为空） |
| `ranking` | 爆款榜排名 | 手提垃圾袋爆款榜·第3名 |

### 可识别的标签

商家投千川、低价好卖、运费险、现货、流量扶持、分期免息、高结算率、首次开佣、包邮

## 文件说明

| 文件/目录 | 说明 |
|-----------|------|
| `run.sh` / `run.js` | 运行入口（shell 封装 / Node.js 主程序） |
| `login.sh` / `login.js` | 登录助手，保存登录状态 |
| `config.json` | 默认配置文件（可编辑） |
| `scrape-final.js` | 爬取脚本模板 |
| `data/` | 输出数据目录（JSON/CSV 文件） |
| `archive/` | 归档的旧版脚本 |
| `.auth-state.json` | 浏览器登录状态（自动生成，勿分享） |
| `README.md` | 本文档 |

## 注意事项

1. **登录状态**：首次使用请先运行 `./login.sh` 登录，状态保存在 `.auth-state.json`
2. **登录过期**：如果爬取时提示未登录，重新运行 `./login.sh` 即可
3. **浏览器窗口**：运行 `./run.sh` 时会打开浏览器窗口，爬取过程可以在浏览器中实时查看
4. **页面结构变化**：脚本依赖特定 CSS 类名，页面改版后需更新 `scrape-final.js` 中的选择器
5. **反爬机制**：滚动间隔 2.5 秒，避免请求过快触发风控
6. **数据去重**：基于商品标题去重，标题相同的商品只保留一条
7. **标题包含标签**：提取的 `title` 字段可能包含标签文本和店铺名称（DOM 结构导致），可在后处理中清洗
8. **空字段处理**：部分字段（如 `monthlySales`、`ranking`）可能为空字符串
9. **加选品车与虚拟滚动**：页面使用虚拟滚动，只有当前可见行在 DOM 中。加选品车时会先滚动到顶部依次点击，若某商品行不在可视区域则跳过（日志中显示 `row not found`）
10. **加选品车弹窗**：部分商品点击"加选品车"后会弹出确认框，脚本会自动点击"我知道了"关闭
