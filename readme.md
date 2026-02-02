# 转换图片文件夹到 webp

### 项目根目录创建配置文件 twebp.config.js

```
module.exports = {
  inputFolder: "images", // 输入文件夹
  outputFolder: "images", // 输出文件夹
  backFolder: "images_back", // 转换文件夹
  include: [".png", ".jpg", ".jpeg", ".gif"], // 包含的文件后缀
  keepName: true, // 是否保持文件名,比如png转换成webp之后文件名依然保持.png结尾
};
```

#### 包含的文件后缀,默认转换[".png", ".jpg", ".jpeg", ".gif"],不能转换的文件类型将自动复制到 output 文件夹，转换错误的文件将复制到 backfolder

### 安装依赖

```
npm install twebp2 -g
```

### 转换图片

```
twebp2
```
