#!/usr/bin/env node

/**
 * 抖音电商登录助手
 * 使用 playwright-cli 打开浏览器，用户登录后保存状态
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const STATE_FILE = path.join(__dirname, '.auth-state.json');

console.log('=== 抖音电商登录助手 ===\n');
console.log('即将打开浏览器，请在浏览器中完成登录\n');

try {
    // 1. 打开浏览器（有头模式）
    console.log('正在打开浏览器...');
    execSync('playwright-cli open --headed https://buyin.jinritemai.com', {
        stdio: 'inherit'
    });

    console.log('\n✅ 浏览器已打开');
    console.log('\n请在浏览器中完成以下操作：');
    console.log('1. 登录抖音电商账号');
    console.log('2. 进入"选品广场"页面');
    console.log('3. 确认页面正常加载后，按回车键继续\n');

    // 等待用户操作
    require('readline').createInterface({
        input: process.stdin,
        output: process.stdout
    }).question('按回车键保存登录状态...', () => {
        try {
            // 2. 保存登录状态
            console.log('\n正在保存登录状态...');
            execSync(`playwright-cli state-save "${STATE_FILE}"`, {
                stdio: 'inherit'
            });

            console.log('\n✅ 登录状态已保存到：' + STATE_FILE);
            console.log('\n现在可以运行爬取脚本了：');
            console.log('  ./run.sh -n 100\n');

            process.exit(0);
        } catch (e) {
            console.error('\n❌ 保存状态失败：', e.message);
            process.exit(1);
        }
    });
} catch (e) {
    console.error('\n❌ 打开浏览器失败：', e.message);
    console.error('\n提示：确保已安装 playwright-cli');
    console.error('  npm install -g @playwright/cli');
    process.exit(1);
}
