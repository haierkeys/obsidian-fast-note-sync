import path from 'node:path';
/**
 * 用法（在项目根目录）：
 *  pnpm run ver -- 0.7.0      # 将 version 设置为 0.7.0
 *  pnpm run ver -- patch (或 c)   # 将 patch 自增（如 0.6.24 -> 0.6.25）
 *  pnpm run ver -- minor (或 b)   # 将 minor 自增（如 0.6.24 -> 0.7.0）
 *  pnpm run ver -- major (或 a)   # 将 major 自增（如 0.6.24 -> 1.0.0）
 *  pnpm run ver -- c- / b- / a-  # 对应的版本回退（如 2.0.6 -> 2.0.5）
 *  或者使用环境变量： NEW_VERSION=0.7.0 pnpm run ver
 *
 * 优先级（目标版本来源）：
 * 1. 命令行参数（pnpm run ver -- <version|major|minor|patch>）
 * 2. 环境变量 NEW_VERSION
 * 3. 环境变量 npm_package_version（不常用，通常为 package.json 中原始值）
 */
import fs from 'node:fs';


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
    return /^\d+\.\d+\.\d+(-[a-zA-Z0-9.]+)?$/.test(v);
}
function bumpVersion(current, part) {
    if (!isValidSemver(current)) throw new Error('当前版本格式不合法: ' + current);

    const firstHyphen = current.indexOf('-');
    const base = firstHyphen === -1 ? current : current.slice(0, firstHyphen);
    const hasSuffix = firstHyphen !== -1;
    const [maj, min, pat] = base.split('.').map(n => parseInt(n, 10));

    if (part === 'major') {
        if (hasSuffix && min === 0 && pat === 0) return base;
        return `${maj + 1}.0.0`;
    }
    if (part === 'minor') {
        if (hasSuffix && pat === 0) return base;
        return `${maj}.${min + 1}.0`;
    }
    if (part === 'patch') {
        if (hasSuffix) return base;
        return `${maj}.${min}.${pat + 1}`;
    }
    if (part === 'down-major') {
        return `${Math.max(0, maj - 1)}.0.0`;
    }
    if (part === 'down-minor') {
        return `${maj}.${Math.max(0, min - 1)}.0`;
    }
    if (part === 'down-patch') {
        return `${maj}.${min}.${Math.max(0, pat - 1)}`;
    }
    throw new Error('未知的增量类型: ' + part);
}
function updateFileVersion(filePath, targetVersion) {
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
    data.version = targetVersion;
    writeJsonWithBackup(filePath, data);
    return { filePath, from, to: targetVersion };
}

// 主逻辑
(function main() {
    const rawArgs = process.argv.slice(2);
    const aliasMap = { 
        'a': 'major', 'b': 'minor', 'c': 'patch',
        '-a': 'down-major', '-b': 'down-minor', '-c': 'down-patch',
        'a-': 'down-major', 'b-': 'down-minor', 'c-': 'down-patch'
    };
    const resolve = (v) => aliasMap[v] || v;

    const arg = resolve(rawArgs[0]);
    const envVersion = resolve(process.env.NEW_VERSION || process.env.npm_package_version || null);
    const bumpOptions = new Set(['major', 'minor', 'patch', 'down-major', 'down-minor', 'down-patch']);

    const cwd = process.cwd();
    const manifestPath = path.join(cwd, 'manifest.json');
    if (!fs.existsSync(manifestPath)) {
        console.error('错误：未找到 manifest.json，无法确定基准版本。');
        process.exit(1);
    }
    const manifestData = readJson(manifestPath);
    const currentBaseVersion = manifestData.version;

    let finalVersion = null;

    if (arg) {
        if (bumpOptions.has(arg)) finalVersion = bumpVersion(currentBaseVersion, arg);
        else if (isValidSemver(arg)) finalVersion = arg;
        else {
            console.error('参数无效，应为 x.y.z 或 major/minor/patch (a/b/c)');
            process.exit(1);
        }
    } else if (envVersion) {
        if (bumpOptions.has(envVersion)) finalVersion = bumpVersion(currentBaseVersion, envVersion);
        else if (isValidSemver(envVersion)) finalVersion = envVersion;
        else {
            console.error('环境变量 NEW_VERSION 格式无效，应为 x.y.z 或 major/minor/patch');
            process.exit(1);
        }
    } else {
        console.error('未提供版本参数：使用 pnpm ver <version|major|minor|patch> 或 NEW_VERSION 环境变量');
        process.exit(1);
    }

    if (!isValidSemver(finalVersion)) {
        console.error('错误：生成的目标版本格式不合法:', finalVersion);
        process.exit(1);
    }

    const targets = [
        path.join(cwd, 'package.json'),
        manifestPath,
    ];

    try {
        const results = [];
        for (const t of targets) {
            const res = updateFileVersion(t, finalVersion);
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

