#!/usr/bin/env node
/**
 * Android 权限配置脚本
 * 在 tauri android init/build 之后执行
 * 从 package.json 读取 androidPermissions 字段自动配置权限
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 路径配置
const PROJECT_ROOT = path.resolve(__dirname, '..');
const ANDROID_DIR = path.join(PROJECT_ROOT, 'src-tauri', 'gen', 'android');
const MANIFEST_PATH = path.join(ANDROID_DIR, 'app', 'src', 'main', 'AndroidManifest.xml');
const PACKAGE_JSON_PATH = path.join(PROJECT_ROOT, 'package.json');

console.log('🎸 配置 Android 权限...\n');

// 从 package.json 读取权限配置
let REQUIRED_PERMISSIONS = [];
try {
  const packageJson = JSON.parse(fs.readFileSync(PACKAGE_JSON_PATH, 'utf-8'));
  if (packageJson.androidPermissions && Array.isArray(packageJson.androidPermissions)) {
    REQUIRED_PERMISSIONS = packageJson.androidPermissions;
    console.log(`📋 从 package.json 读取到 ${REQUIRED_PERMISSIONS.length} 个权限配置\n`);
  } else {
    console.log('⚠️ package.json 中没有 androidPermissions 字段，使用默认配置\n');
    REQUIRED_PERMISSIONS = [
      { name: 'android.permission.INTERNET', comment: '网络访问' },
      { name: 'android.permission.RECORD_AUDIO', comment: '麦克风权限 - 吉他调音功能需要' },
      { name: 'android.permission.MODIFY_AUDIO_SETTINGS', comment: '音频设置修改' }
    ];
  }
} catch (err) {
  console.error(`❌ 读取 package.json 失败: ${err.message}`);
  process.exit(1);
}

if (REQUIRED_PERMISSIONS.length === 0) {
  console.log('ℹ️ 没有需要配置的权限\n');
  process.exit(0);
}

// 检查 android 目录是否存在
if (!fs.existsSync(ANDROID_DIR)) {
  console.error(`❌ 错误: 找不到 ${ANDROID_DIR}`);
  console.error('请先运行: npm run android:init');
  process.exit(1);
}

// 检查 AndroidManifest.xml 是否存在
if (!fs.existsSync(MANIFEST_PATH)) {
  console.error(`❌ 错误: 找不到 ${MANIFEST_PATH}`);
  console.error('AndroidManifest.xml 不存在，请检查 Tauri 配置');
  process.exit(1);
}

console.log(`📄 读取: ${MANIFEST_PATH}`);

let manifestContent = fs.readFileSync(MANIFEST_PATH, 'utf-8');
let modified = false;

  // 检查并添加每个权限
for (const perm of REQUIRED_PERMISSIONS) {
  if (manifestContent.includes(perm.name)) {
    console.log(`   ✅ ${perm.name} 已存在 (${perm.comment})`);
  } else {
    console.log(`   ➕ 添加: ${perm.name} (${perm.comment})`);
    
    // 在 manifest 标签内添加权限（在 application 标签之前）
    const comment = perm.comment ? `    <!-- ${perm.comment} -->\n    ` : '    ';
    const newPermissionLine = `${comment}<uses-permission android:name="${perm.name}" />\n`;
    
    // 找到 <application 标签，在其之前插入权限
    if (manifestContent.includes('<application')) {
      manifestContent = manifestContent.replace(
        '    <application',
        `${newPermissionLine}    <application`
      );
    } else {
      // 如果没有 application 标签，在 </manifest> 之前添加
      manifestContent = manifestContent.replace(
        '</manifest>',
        `${newPermissionLine}</manifest>`
      );
    }
    modified = true;
  }
}

// 保存修改
if (modified) {
  fs.writeFileSync(MANIFEST_PATH, manifestContent);
  console.log('\n✅ 已更新 AndroidManifest.xml');
} else {
  console.log('\n✅ 所有权限已配置，无需修改');
}

// 验证权限
console.log('\n📋 权限验证:');
const finalContent = fs.readFileSync(MANIFEST_PATH, 'utf-8');
for (const perm of REQUIRED_PERMISSIONS) {
  const exists = finalContent.includes(perm.name);
  console.log(`   ${exists ? '✅' : '❌'} ${perm.name}`);
}

console.log('\n✨ Android 权限配置完成！');
console.log('\n注意: Android 6.0+ 需要运行时权限申请，前端代码已处理');
