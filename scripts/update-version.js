#!/usr/bin/env node
/**
 * 用法（在项目根目录）：
 *  pnpm run ver -- 0.7.0      # 将 version 设置为 0.7.0
 *  pnpm run ver -- patch (或 c) # 将 patch 自增（如 0.6.24 -> 0.6.25）
 *  pnpm run ver -- minor (或 b) # 将 minor 自增（如 0.6.24 -> 0.6.25）
 *  pnpm run ver -- major (或 a) # 将 major 自增（如 0.6.24 -> 0.6.25）
 *  或者使用环境变量： NEW_VERSION=0.7.0 pnpm run ver
 *
 * 优先级（目标版本来源）：
 * 1. 命令行参数（pnpm run ver -- <version|major|minor|patch>）
 * 2. 环境变量 NEW_VERSION
 * 3. 环境变量 npm_package_version（不常用，通常为 package.json 中原始值）
 */

const fs = require('fs');
const path = require('path');

function readJson(filePath) {
    const txt = fs.readFileSync(filePath, 'utf8');
    return JSON.parse(txt);
}
function writeJsonWithBackup(filePath, obj) {
    const txt = JSON.stringify(obj, null, 2) + '\n';
    const bak = filePath + '.bak';
    //if (fs.existsSync(filePath)) fs.copyFileSync(filePath, bak);
    fs.writeFileSync(filePath, txt, 'utf8');
}
function isValidSemver(v) {
    return /^\d+\.\d+\.\d+$/.test(v);
}
function bumpVersion(current, part) {
    if (!isValidSemver(current)) throw new Error('当前版本不是 x.y.z 格式: ' + current);
    const [maj, min, pat] = current.split('.').map(n => parseInt(n, 10));
    if (part === 'major') return `${maj + 1}.0.0`;
    if (part === 'minor') return `${maj}.${min + 1}.0`;
    if (part === 'patch') return `${maj}.${min}.${pat + 1}`;
    throw new Error('未知的增量类型: ' + part);
}
function updateFileVersion(filePath, targetVersion, bumpOption) {
    if (!fs.existsSync(filePath)) {
        console.warn('文件不存在，跳过:', filePath);
        return null;
    }
    const data = readJson(filePath);
    if (!data.version) {
        console.warn('文件中没有 version 字段，跳过:', filePath);
        return null;
    }
    const from = data.version;
    let to = targetVersion;
    if (!to && bumpOption) to = bumpVersion(from, bumpOption);
    if (!to) throw new Error('没有提供目标版本或增量选项');
    if (!isValidSemver(to)) throw new Error('目标版本格式不合法，应为 x.y.z: ' + to);
    data.version = to;
    writeJsonWithBackup(filePath, data);
    return { filePath, from, to };
}

// 主逻辑
(function main() {
    const rawArgs = process.argv.slice(2); // 通过 npm run bump -- <args> 传入

    const aliasMap = { 'a': 'major', 'b': 'minor', 'c': 'patch' };
    const resolve = (v) => aliasMap[v] || v;

    const arg = resolve(rawArgs[0]);
    const envVersion = resolve(process.env.NEW_VERSION || process.env.npm_package_version || null);
    const bumpOptions = new Set(['major', 'minor', 'patch']);

    let newVersion = null;
    let bumpOption = null;

    if (arg) {
        if (bumpOptions.has(arg)) bumpOption = arg;
        else if (isValidSemver(arg)) newVersion = arg;
        else {
            console.error('参数无效，应为 x.y.z 或 major/minor/patch');
            process.exit(1);
        }
    } else if (envVersion) {
        if (bumpOptions.has(envVersion)) bumpOption = envVersion;
        else if (isValidSemver(envVersion)) newVersion = envVersion;
        else {
            console.error('环境变量 NEW_VERSION 格式无效，应为 x.y.z 或 major/minor/patch');
            process.exit(1);
        }
    } else {
        console.error('未提供版本参数：使用 npm run bump -- <version|major|minor|patch> 或 NEW_VERSION 环境变量');
        process.exit(1);
    }

    const cwd = process.cwd();
    const targets = [
        path.join(cwd, 'package.json'),
        path.join(cwd, 'manifest.json'),
    ];

    try {
        const results = [];
        for (const t of targets) {
            const res = updateFileVersion(t, newVersion, bumpOption);
            if (res) results.push(res);
        }
        if (results.length === 0) {
            console.warn('没有更新任何文件。');
            process.exit(0);
        }
        for (const r of results) {
            console.log(`${path.basename(r.filePath)}: ${r.from} -> ${r.to}`);
        }
    } catch (err) {
        console.error('错误：', err.message);
        process.exit(1);
    }
})();
