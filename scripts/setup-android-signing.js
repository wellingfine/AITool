#!/usr/bin/env node
/**
 * Android 签名配置脚本
 * 在 tauri android init 之后执行
 * 1. 复制 keystore.properties 到 android 项目目录
 * 2. 检查/配置 build.gradle.kts 签名设置
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 路径配置
const PROJECT_ROOT = path.resolve(__dirname, '..');
const KEYSTORE_SOURCE = path.join(PROJECT_ROOT, 'keystore.properties');
const ANDROID_DIR = path.join(PROJECT_ROOT, 'src-tauri', 'gen', 'android');
const KEYSTORE_DEST = path.join(ANDROID_DIR, 'keystore.properties');
const APP_BUILD_GRADLE = path.join(ANDROID_DIR, 'app', 'build.gradle.kts');

console.log('🚀 开始配置 Android 签名...\n');

// 1. 检查源文件是否存在
if (!fs.existsSync(KEYSTORE_SOURCE)) {
  console.error(`❌ 错误: 找不到 ${KEYSTORE_SOURCE}`);
  console.error('请确保项目根目录存在 keystore.properties 文件');
  process.exit(1);
}

// 2. 检查 android 目录是否存在
if (!fs.existsSync(ANDROID_DIR)) {
  console.error(`❌ 错误: 找不到 ${ANDROID_DIR}`);
  console.error('请先运行: npm run android:init');
  process.exit(1);
}

// 3. 复制 keystore.properties
console.log('📋 复制 keystore.properties...');
try {
  fs.copyFileSync(KEYSTORE_SOURCE, KEYSTORE_DEST);
  console.log(`   ✅ 已复制到: ${KEYSTORE_DEST}`);
} catch (err) {
  console.error(`   ❌ 复制失败: ${err.message}`);
  process.exit(1);
}

// 4. 检查并配置 build.gradle.kts
console.log('\n🔧 检查 app/build.gradle.kts 配置...');

if (!fs.existsSync(APP_BUILD_GRADLE)) {
  console.error(`   ❌ 错误: 找不到 ${APP_BUILD_GRADLE}`);
  process.exit(1);
}

let buildGradleContent = fs.readFileSync(APP_BUILD_GRADLE, 'utf-8');

// 检查是否已有签名配置
const hasSigningConfig = buildGradleContent.includes('signingConfigs');

if (hasSigningConfig) {
  console.log('   ✅ signingConfigs 配置已存在');
} else {
  console.log('   ⚠️ 未找到签名配置，需要添加...');
  
  // 在 android { 块中添加签名配置
  const signingConfigCode = `
    signingConfigs {
        create("release") {
            val keystorePropertiesFile = rootProject.file("keystore.properties")
            val keystoreProperties = Properties()
            if (keystorePropertiesFile.exists()) {
                keystoreProperties.load(FileInputStream(keystorePropertiesFile))
            }

            keyAlias = keystoreProperties["keyAlias"] as String
            keyPassword = keystoreProperties["keyPassword"] as String
            storeFile = file(keystoreProperties["storeFile"] as String)
            storePassword = keystoreProperties["storePassword"] as String
        }
    }
`;

  // 在 defaultConfig 之后插入 signingConfigs
  const defaultConfigEndPattern = /(defaultConfig\s*\{[\s\S]*?\}\s*)/;
  if (defaultConfigEndPattern.test(buildGradleContent)) {
    buildGradleContent = buildGradleContent.replace(
      defaultConfigEndPattern,
      `$1${signingConfigCode}`
    );
  }

  // 检查 release buildType 是否使用了签名配置
  if (!buildGradleContent.includes('signingConfig = signingConfigs.getByName("release")')) {
    // 在 release buildType 中添加签名配置
    buildGradleContent = buildGradleContent.replace(
      /(getByName\("release"\)\s*\{)/,
      `$1\n            signingConfig = signingConfigs.getByName("release")`
    );
  }

  fs.writeFileSync(APP_BUILD_GRADLE, buildGradleContent);
  console.log('   ✅ 已添加签名配置');
}

// 5. 验证配置
console.log('\n📋 验证配置...');

// 检查必要的导入
const hasPropertiesImport = buildGradleContent.includes('import java.util.Properties');
const hasFileInputStreamImport = buildGradleContent.includes('import java.io.FileInputStream');

if (!hasPropertiesImport || !hasFileInputStreamImport) {
  console.log('   ⚠️ 添加必要的 import 语句...');
  
  let imports = '';
  if (!hasPropertiesImport) imports += 'import java.util.Properties\n';
  if (!hasFileInputStreamImport) imports += 'import java.io.FileInputStream\n';
  
  // 在文件开头添加 import
  buildGradleContent = imports + buildGradleContent;
  fs.writeFileSync(APP_BUILD_GRADLE, buildGradleContent);
}

console.log('   ✅ Import 检查完成');

console.log('\n✨ Android 签名配置完成！');
console.log('\n接下来可以运行:');
console.log('   npm run android:debug    # 构建调试版本');
console.log('   npm run android:release  # 构建发布版本');
