/**
 * 版本同步脚本
 * 将 package.json 中的 version 同步到 Tauri 配置文件中
 */

import { readFileSync, writeFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = resolve(__dirname, '..');

// 读取 package.json 的版本
const packageJsonPath = resolve(rootDir, 'package.json');
const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf-8'));
const version = packageJson.version;

console.log(`📦 从 package.json 读取版本: ${version}`);

// 同步到 tauri.conf.json
const tauriConfPath = resolve(rootDir, 'src-tauri', 'tauri.conf.json');
const tauriConf = JSON.parse(readFileSync(tauriConfPath, 'utf-8'));
if (tauriConf.version !== version) {
  tauriConf.version = version;
  writeFileSync(tauriConfPath, JSON.stringify(tauriConf, null, 2) + '\n');
  console.log(`✅ 已更新 tauri.conf.json: ${version}`);
} else {
  console.log(`⏭️  tauri.conf.json 版本已是最新`);
}

// 同步到 Cargo.toml
const cargoTomlPath = resolve(rootDir, 'src-tauri', 'Cargo.toml');
let cargoTomlContent = readFileSync(cargoTomlPath, 'utf8');

const versionRegex = /^(version\s*=\s*")[^"]+(")/m;
const currentCargoVersion = cargoTomlContent.match(versionRegex)?.[0]?.match(/"([^"]+)"/)?.[1];

if (currentCargoVersion !== version) {
  cargoTomlContent = cargoTomlContent.replace(versionRegex, `$1${version}$2`);
  writeFileSync(cargoTomlPath, cargoTomlContent);
  console.log(`✅ 已更新 Cargo.toml: ${version}`);
} else {
  console.log(`⏭️  Cargo.toml 版本已是最新`);
}

console.log('\n🎉 版本同步完成!');
