#!/usr/bin/env node

/**
 * 抖音选品广场数据爬取工具 - 运行器
 * 用法: node run.js [选项]  (或 ./run.sh [选项])
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// ============ 命令行参数解析 ============

const args = process.argv.slice(2);
const options = {};

for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
        case '-n': case '--count':
            options.count = parseInt(args[++i]); break;
        case '-m': case '--mode':
            options.mode = args[++i]; break;
        case '-s': case '--scroll':
            options.scroll = parseInt(args[++i]); break;
        case '-f': case '--filter':
            options.filter = true; break;
        case '-F': case '--no-filter':
            options.filter = false; break;
        case '--ui-filter':
            options.uiFilter = true; break;
        case '--no-ui-filter':
            options.uiFilter = false; break;
        case '-t': case '--tags':
            options.tags = args[++i]; break;
        case '-o': case '--output':
            options.output = args[++i]; break;
        case '--no-csv':
            options.noCsv = true; break;
        case '-h': case '--help':
            options.help = true; break;
        default:
            console.error('未知选项:', args[i]);
            process.exit(1);
    }
}

if (options.help) {
    console.log(`
抖音选品广场数据爬取工具

用法: node run.js [选项]  (或 ./run.sh [选项])

前置条件:
  1. 在浏览器中打开并登录巨量百应: https://buyin.jinritemai.com
  2. 进入"选品广场"页面
  3. 然后运行此脚本

选项:
  -n, --count <数量>        目标爬取数量 (默认: 50)
  -m, --mode <table|grid>   视图模式 (默认: table)
  -s, --scroll <次数>       最大滚动次数 (默认: 20)
  -f, --filter              启用数据后处理过滤
  -F, --no-filter           禁用数据后处理过滤
  --ui-filter               启用页面UI筛选器
  --no-ui-filter            禁用页面UI筛选器
  -t, --tags <标签1,标签2>  标签过滤，逗号分隔 (OR关系)
  -o, --output <名称>       输出文件名前缀 (不含扩展名)
  --no-csv                  不生成CSV文件
  -h, --help                显示此帮助信息

示例:
  node run.js                          # 使用默认配置
  node run.js -n 100                   # 爬取100条
  node run.js -m grid -t "高结算率"    # 卡片视图，按标签过滤
  node run.js --ui-filter -n 50       # 启用页面筛选器
  node run.js -n 30 -o my_products    # 自定义输出文件名

配置文件:
  编辑 config.json 修改默认配置，CLI参数会覆盖配置项
`);
    process.exit(0);
}

// ============ 路径配置 ============

const SCRIPT_DIR = __dirname;
const CONFIG_FILE = path.join(SCRIPT_DIR, 'config.json');
const TEMPLATE_FILE = path.join(SCRIPT_DIR, 'scrape-final.js');
const TEMP_SCRIPT_FILE = path.join(SCRIPT_DIR, '.temp_scrape.js');
const STATE_FILE = path.join(SCRIPT_DIR, '.auth-state.json');
const TEMP_OUTPUT_FILE = path.join(SCRIPT_DIR, '.temp_output.txt');
const OUTPUT_DIR = path.join(SCRIPT_DIR, 'data');

// 确保输出目录存在
if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

// ============ 读取并合并配置 ============

let config;
try {
    config = JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf-8'));
} catch (e) {
    console.error('错误: 读取配置文件失败 -', e.message);
    process.exit(1);
}

// 应用CLI覆盖
if (options.count !== undefined) config.TARGET_COUNT = options.count;
if (options.mode !== undefined) config.VIEW_MODE = options.mode;
if (options.scroll !== undefined) config.MAX_SCROLL = options.scroll;
if (options.filter !== undefined) config.POST_FILTER = options.filter;
if (options.uiFilter !== undefined) config.APPLY_UI_FILTERS = options.uiFilter;
if (options.tags !== undefined) {
    if (!config.FILTER) config.FILTER = {};
    config.FILTER.tagsInclude = options.tags.split(',').map(t => t.trim());
}

// 生成输出文件名
const OUTPUT_NAME = options.output || 'products_' + new Date().toISOString().replace(/[-:T]/g, '').slice(0, 14);

// ============ 显示配置 ============

console.log('=== 抖音选品广场数据爬取工具 ===\n');
console.log('当前配置:');
console.log('  目标数量:', config.TARGET_COUNT);
console.log('  视图模式:', config.VIEW_MODE);
console.log('  最大滚动:', config.MAX_SCROLL);
console.log('  UI筛选器:', config.APPLY_UI_FILTERS ? '启用' : '禁用');
console.log('  数据过滤:', config.POST_FILTER ? '启用' : '禁用');
if (config.FILTER && config.FILTER.tagsInclude) {
    console.log('  标签过滤:', config.FILTER.tagsInclude.join(', '));
}
console.log('  输出文件:', OUTPUT_NAME);
console.log('');

// ============ 生成临时脚本 ============

let template;
try {
    template = fs.readFileSync(TEMPLATE_FILE, 'utf-8');
} catch (e) {
    console.error('错误: 读取模板文件失败 -', e.message);
    process.exit(1);
}

// 提取函数体（跳过前12行：第1行 async (page) => {，第2-12行 CONFIG 定义块）
const lines = template.split('\n');
const functionBody = lines.slice(12).join('\n');

// 构建完整脚本
const fullScript = `async (page) => {
  const CONFIG = ${JSON.stringify(config, null, 2).replace(/\n/g, '\n  ')};

${functionBody}`;

// 写入临时文件
fs.writeFileSync(TEMP_SCRIPT_FILE, fullScript);

// ============ 运行爬取 ============

console.log('开始爬取...');

// 检查浏览器会话状态
let sessionOpen = false;
try {
    const listOutput = execSync('playwright-cli list', { encoding: 'utf-8' });
    if (listOutput.includes('status: open')) {
        sessionOpen = true;
        console.log('检测到已打开的浏览器会话');
    }
} catch (e) {}

// 检查登录状态文件
if (fs.existsSync(STATE_FILE)) {
    if (!sessionOpen) {
        console.log('正在打开浏览器...');
        try {
            execSync(`playwright-cli open --headed`, { stdio: 'inherit' });
        } catch (e) {
            console.log('⚠️ 打开浏览器失败');
        }
    }

    // 总是加载登录状态
    console.log('正在加载登录状态...');
    try {
        execSync(`playwright-cli state-load "${STATE_FILE}"`, { stdio: 'inherit' });
        console.log('✅ 登录状态已加载\n');
    } catch (e) {
        console.log('⚠️ 加载登录状态失败，可能需要重新登录');
        console.log('  运行 ./login.sh 重新登录\n');
    }

    // 导航到选品广场页面
    console.log('正在导航到选品广场...');
    try {
        execSync(`playwright-cli goto https://buyin.jinritemai.com/dashboard/merch-picking-library`, { stdio: 'inherit' });
        // 等待页面加载完成
        execSync('sleep 5', { stdio: 'inherit' });
        console.log('✅ 已进入选品广场\n');
    } catch (e) {
        console.log('⚠️ 导航失败，请手动进入选品广场');
    }
} else {
    console.log('⚠️ 未找到登录状态文件');
    console.log('  请先运行 ./login.sh 登录\n');
}

// 使用 --raw 选项获取纯返回值，输出重定向到文件
try {
    execSync(`playwright-cli run-code --raw --filename "${TEMP_SCRIPT_FILE}" > "${TEMP_OUTPUT_FILE}"`, {
        cwd: SCRIPT_DIR,
        timeout: 300000
    });
} catch (e) {
    console.error('\n❌ 爬取失败：', e.message);
}

// 读取输出
let rawOutput;
try {
    rawOutput = fs.readFileSync(TEMP_OUTPUT_FILE, 'utf-8');
} catch (e) {
    console.error('错误: 无法读取输出文件');
    rawOutput = '';
}

// 清理临时文件
try { fs.unlinkSync(TEMP_SCRIPT_FILE); } catch (_) {}
try { fs.unlinkSync(TEMP_OUTPUT_FILE); } catch (_) {}

// ============ 提取JSON数据 ============

// 先去掉前后空白字符
rawOutput = rawOutput.trim();

// 检查是否是双重编码的 JSON（以双引号开头和结尾）
let jsonStr;
if (rawOutput.startsWith('"') && rawOutput.endsWith('"')) {
    // 双重编码：先解析外层字符串，再解析内层 JSON
    jsonStr = rawOutput;
} else {
    // 直接是 JSON 数组
    const start = rawOutput.indexOf('[');
    const end = rawOutput.lastIndexOf(']');

    if (start === -1 || end === -1 || end <= start) {
        console.error('\n错误: 未找到JSON数据');
        console.error('原始输出前500字符:', rawOutput.substring(0, 500));
        process.exit(1);
    }

    jsonStr = rawOutput.substring(start, end + 1);
}

let data;
try {
    // 解析外层 JSON
    const parsed = JSON.parse(jsonStr);

    // 如果解析结果是字符串，说明是双重编码，再解析一次
    if (typeof parsed === 'string') {
        data = JSON.parse(parsed);
    } else {
        data = parsed;
    }

    // 确保 data 是数组
    if (!Array.isArray(data)) {
        throw new Error('解析结果不是数组');
    }
} catch (e) {
    console.error('错误: 解析JSON失败 -', e.message);
    console.error('尝试解析的内容:', jsonStr.substring(0, 200));
    process.exit(1);
}

// ============ 保存文件 ============

const JSON_FILE = path.join(OUTPUT_DIR, `${OUTPUT_NAME}.json`);
const CSV_FILE = path.join(OUTPUT_DIR, `${OUTPUT_NAME}.csv`);

// 保存JSON
fs.writeFileSync(JSON_FILE, JSON.stringify(data, null, 2), 'utf-8');

console.log('\n=== 爬取完成 ===');
console.log('共获取', data.length, '条商品数据');
console.log('JSON文件:', JSON_FILE);

// 生成CSV
if (!options.noCsv && data.length > 0) {
    console.log('\n正在生成CSV文件...');

    // 字段名到中文的映射
    const columnMap = {
        'index': '序号',
        'title': '商品标题',
        'tags': '标签',
        'shopName': '店铺名称',
        'shopScore': '店铺评分',
        'price': '价格',
        'commissionRate': '佣金比例',
        'commissionType': '佣金类型',
        'estimatedEarning': '预估收益',
        'investmentCommission': '投放佣金',
        'goodReviewRate': '好评率',
        'sellerCount': '带货达人数',
        'salesVolume': '销量',
        'monthlySales': '月销',
        'ranking': '排名',
        'productUrl': '商品链接'
    };

    const columns = Object.keys(columnMap);

    // CSV with UTF-8 BOM for Excel compatibility - 使用中文表头
    let csv = '' + columns.map(col => columnMap[col]).join(',') + '\n';

    for (const product of data) {
        const row = columns.map(col => {
            let value = product[col] || '';
            value = String(value);
            // 转义双引号
            value = value.replace(/"/g, '""');
            // 包含逗号、引号或换行时用引号包裹
            if (value.includes(',') || value.includes('"') || value.includes('\n')) {
                value = '"' + value + '"';
            }
            return value;
        });
        csv += row.join(',') + '\n';
    }

    fs.writeFileSync(CSV_FILE, csv, 'utf-8');
    console.log('CSV文件:', CSV_FILE);
    console.log('共', data.length, '行');
}

console.log('\n完成！');
