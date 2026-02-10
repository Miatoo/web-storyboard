/**
 * Storyboarder 资源提取脚本
 * 
 * 注意：此脚本仅用于提取 Storyboarder 软件中的资源文件。
 * 使用前请确保已获得必要的使用授权。
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const STORYBOARDER_PATH = 'C:\\Program Files\\Storyboarder';
const APP_ASAR_PATH = path.join(STORYBOARDER_PATH, 'resources', 'app.asar');
const EXTRACT_DIR = './temp_extract';
const OUTPUT_DIR = './public/models';

// 创建输出目录
const outputDirs = {
  characters: path.join(OUTPUT_DIR, 'characters'),
  poses: path.join(OUTPUT_DIR, 'poses'),
  cameras: path.join(OUTPUT_DIR, 'cameras'),
};

Object.values(outputDirs).forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

function checkAsarInstalled() {
  try {
    // 尝试使用 @electron/asar 或 asar
    try {
      execSync('asar --version', { stdio: 'ignore' });
      return true;
    } catch {
      // 如果 asar 不可用，尝试 @electron/asar
      execSync('npx @electron/asar --version', { stdio: 'ignore' });
      return true;
    }
  } catch {
    return false;
  }
}

function extractAsar() {
  if (!fs.existsSync(APP_ASAR_PATH)) {
    console.error(`未找到 app.asar 文件: ${APP_ASAR_PATH}`);
    return false;
  }

  if (!checkAsarInstalled()) {
    console.error('未安装 asar 工具。');
    console.error('请运行以下命令之一：');
    console.error('  npm install -g @electron/asar  （推荐）');
    console.error('  或 npm install -g asar');
    return false;
  }

  try {
    console.log('正在提取 app.asar 文件...');
    execSync(`asar extract "${APP_ASAR_PATH}" "${EXTRACT_DIR}"`, { stdio: 'inherit' });
    return true;
  } catch (error) {
    console.error('提取失败:', error.message);
    return false;
  }
}

function findFiles(dir, extensions, outputPath) {
  const files = [];
  
  function walkDir(currentDir) {
    const entries = fs.readdirSync(currentDir, { withFileTypes: true });
    
    for (const entry of entries) {
      const fullPath = path.join(currentDir, entry.name);
      
      if (entry.isDirectory()) {
        walkDir(fullPath);
      } else if (extensions.some(ext => entry.name.toLowerCase().endsWith(ext))) {
        files.push(fullPath);
      }
    }
  }
  
  try {
    walkDir(dir);
  } catch (error) {
    console.error(`扫描目录失败: ${dir}`, error.message);
  }
  
  return files;
}

function copyFiles(files, outputDir) {
  let copied = 0;
  files.forEach(file => {
    try {
      const fileName = path.basename(file);
      const destPath = path.join(outputDir, fileName);
      fs.copyFileSync(file, destPath);
      copied++;
      console.log(`已复制: ${fileName}`);
    } catch (error) {
      console.error(`复制失败: ${file}`, error.message);
    }
  });
  return copied;
}

function main() {
  console.log('Storyboarder 资源提取工具');
  console.log('==========================\n');
  
  // 提取 asar 文件
  if (!extractAsar()) {
    console.error('提取失败，退出。');
    return;
  }
  
  // 查找模型文件
  console.log('\n正在查找模型文件...');
  const modelFiles = findFiles(EXTRACT_DIR, ['.glb', '.gltf', '.fbx', '.obj']);
  console.log(`找到 ${modelFiles.length} 个模型文件`);
  
  // 查找预设文件
  console.log('\n正在查找预设文件...');
  const poseFiles = findFiles(EXTRACT_DIR, ['.json']).filter(file => 
    file.toLowerCase().includes('pose') || 
    file.toLowerCase().includes('action') ||
    file.toLowerCase().includes('preset')
  );
  console.log(`找到 ${poseFiles.length} 个预设文件`);
  
  // 查找镜头配置
  const cameraFiles = findFiles(EXTRACT_DIR, ['.json']).filter(file =>
    file.toLowerCase().includes('camera') ||
    file.toLowerCase().includes('shot') ||
    file.toLowerCase().includes('framing')
  );
  console.log(`找到 ${cameraFiles.length} 个镜头配置文件`);
  
  // 复制文件
  console.log('\n正在复制文件...');
  let totalCopied = 0;
  totalCopied += copyFiles(modelFiles, outputDirs.characters);
  totalCopied += copyFiles(poseFiles, outputDirs.poses);
  totalCopied += copyFiles(cameraFiles, outputDirs.cameras);
  
  console.log(`\n完成！共复制 ${totalCopied} 个文件`);
  console.log(`\n文件已复制到: ${OUTPUT_DIR}`);
  console.log('\n注意：请确保您有权使用这些资源！');
}

if (require.main === module) {
  main();
}

module.exports = { extractAsar, findFiles, copyFiles };

