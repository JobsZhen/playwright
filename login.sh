#!/bin/bash
# 抖音电商登录助手
# 用法: ./login.sh

set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
STATE_FILE="$SCRIPT_DIR/.auth-state.json"

echo "=== 抖音电商登录助手 ==="
echo ""

# 检查是否已有浏览器会话
SESSION_INFO=$(playwright-cli list 2>&1 || echo "")
if echo "$SESSION_INFO" | grep -q "status: open"; then
    echo "检测到已打开的浏览器会话，正在复用..."
else
    echo "正在打开浏览器..."
    playwright-cli open --headed https://buyin.jinritemai.com
fi

echo ""
echo "✅ 浏览器已打开"
echo ""
echo "请完成以下操作："
echo "1. 登录抖音电商账号"
echo "2. 进入"选品广场"页面"
echo "3. 确认页面正常加载后，按回车键继续"
echo ""

read -p "按回车键保存登录状态..."

# 保存登录状态
echo ""
echo "正在保存登录状态..."
playwright-cli state-save "$STATE_FILE"

echo ""
echo "✅ 登录状态已保存到：$STATE_FILE"
echo ""
echo "现在可以运行爬取脚本了："
echo "  ./run.sh -n 100"
echo ""
