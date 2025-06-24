#!/usr/bin/env node

const process = require("process");
const sharp = require("sharp");
const fs = require("fs");
const path = require("path");
const colors = require("colors");
const chokidar = require("chokidar");

const root = process.cwd();

const configPath = path.join(root, "./twebp.config.js");
const config = require(configPath);
if (!config.inputFolder || !config.outputFolder) {
  throw new Error(
    "请检查当前配置文件twebp.config.js的inputFolder和outputFolder"
  );
}
const inputFolder = path.join(root, config.inputFolder);
const outputFolder = path.join(root, config.outputFolder);
const backFolder = path.join(
  root,
  config.backFolder ? config.backFolder : config.outputFolder
);
const includeFiles = config.include
  ? config.include
  : [".png", ".jpg", ".jpeg", ".gif"];
const excludeFiles = config.exclude ? config.exclude : [];
async function init() {
  var isExist = await fs.existsSync(backFolder);
  if (!isExist) await fs.mkdirSync(backFolder);
  var isExist = await fs.existsSync(outputFolder);
  if (!isExist) await fs.mkdirSync(outputFolder);
}

const cls = function (text, color = "green") {
  return colors[color](text);
};
const clsp = function (text, color = "yellow") {
  return colors[color](text);
};

async function convertToWebP(inputPath, outputPath, backPath) {
  try {
    let config = { animated: true };
    // if (inputPath.endsWith(".gif")) {
    //   config = {
    //     animated: true,
    //   };
    // }

    await sharp(inputPath, config).webp().toFile(outputPath);
    // console.log("Image converted to WebP successfully!");
  } catch (error) {
    console.log(
      cls(`转换错误`, "red"),
      clsp(inputFolder),
      cls("->", "red"),
      clsp(outputPath),
      cls("将自动复制文件到指定目录", "red"),
      clsp(backPath)
    );
    doCopy(inputPath, backPath);
  }
}

async function ensureDirectoryExistence(filePath) {
  const dirname = path.dirname(filePath);
  if (fs.existsSync(dirname)) {
    return true;
  }
  await ensureDirectoryExistence(dirname);
  await fs.mkdirSync(dirname);
}

async function doCopy(fromPath, toPath) {
  await ensureDirectoryExistence(toPath);
  await fs.copyFileSync(fromPath, toPath);
}

async function doHandle(infolder, outfolder, back) {
  let folder = infolder;
  let output = outfolder;
  const isDirectory = await fs.statSync(folder);
  let files = [];
  if (isDirectory.isDirectory()) {
    files = await fs.readdirSync(folder);
  } else {
    files = [path.basename(infolder)];
    folder = path.dirname(infolder);
  }

  console.log(files, folder, output);

  for (let i = 0; i < files.length; i++) {
    const filePath = files[i];
    const inputPath = path.join(folder, filePath);
    const outputPath = path.join(output, filePath);
    const backPath = path.join(back, filePath);
    const stats = await fs.statSync(inputPath);

    if (stats.isDirectory()) {
      const isExist = await fs.existsSync(outputPath);
      if (!isExist) await fs.mkdirSync(outputPath);
      doHandle(
        path.join(folder, filePath),
        path.join(output, filePath),
        backPath
      );
    } else {
      let outputPathWebp = outputPath.replace(/\.[^.]+$/, ".webp");
      const isFileExist = await fs.existsSync(outputPathWebp);
      if (!isFileExist) {
        if (checkNeedCovert(inputPath)) {
          await convertToWebP(inputPath, outputPathWebp, backPath);
        } else {
          console.log(cls("文件不支持转换，将自动复制"), clsp(inputPath));
          doCopy(inputPath, outputPath);
        }
      }
    }
  }
}

const checkNeedCovert = (pathname) => {
  let canCovert = false;
  includeFiles.map((item) => {
    if (pathname.endsWith(path.normalize(item))) {
      canCovert = true;
    }
  });
  excludeFiles.map((item) => {
    if (pathname.endsWith(path.normalize(item))) {
      canCovert = false;
    }
  });

  return canCovert;
};

async function doWatch() {
  console.log(
    cls("初始化监听----"),
    cls("输入目录"),
    cls(inputFolder, "yellow"),
    cls("输出目录"),
    cls(outputFolder, "yellow")
  );
  const watcher = chokidar.watch(inputFolder, {
    persistent: true,
    ignoreInitial: true,
    awaitWriteFinish: true,
  });
  await init();

  doHandle(inputFolder, outputFolder, backFolder);

  watcher.on("add", async (filePath) => {
    console.log(cls("新增文件:"), cls(filePath, "yellow"));
    const file = filePath.replace(inputFolder, "");
    const fileName = path.join(outputFolder, file.replace(/\.[^.]+$/, ".webp"));
    const toBackPath = path.dirname(path.join(backFolder, file));
    doHandle(filePath, path.dirname(fileName), toBackPath);
  });
  watcher.on("change", async (filePath) => {
    console.log(cls("修改文件:"), cls(filePath, "yellow"));
    const file = filePath.replace(inputFolder, "");
    const fileName = path.join(outputFolder, file.replace(/\.[^.]+$/, ".webp"));
    const isExist = await fs.existsSync(fileName);
    if (isExist) {
      console.log(cls("删除旧文件：%s"), fileName);
      await fs.unlinkSync(fileName);
    }

    const toBackPath = path.dirname(path.join(backFolder, file));
    doHandle(filePath, path.dirname(fileName), toBackPath);
  });
  watcher.on("unlink", async (filePath) => {
    console.log(cls("删除文件："), cls(filePath, "yellow"));
    const file = filePath.replace(inputFolder, "");
    const fileName = path.join(outputFolder, file.replace(/\.[^.]+$/, ".webp"));
    const isExist = await fs.existsSync(fileName);
    if (isExist) {
      console.log(cls("删除转换后的文件文件", "red"), cls(fileName, "yellow"));
      fs.unlinkSync(fileName);
    }
  });
}

doWatch();
