/**
 * @type {HTMLVideoElement }
 */
const video = document.querySelector('video');
/**
 * @type {HTMLCanvasElement }
 */
const canvas = document.querySelector('canvas');
/**
 * @type {CanvasRenderingContext2D}
 * */
const ctx = canvas.getContext('2d');
const debugInfo = document.getElementById('debug');
const startBtn = document.getElementById('startBtn');

let isDetecting = false;
let animationId = null;

// 启动摄像头
startBtn.addEventListener('click', function () {
    if (isDetecting) {
        stopDetection();
        startBtn.textContent = '开始检测';
    } else {
        startDetection();
        startBtn.textContent = '停止检测';
    }
});

function startDetection() {
    if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        navigator.mediaDevices.getUserMedia({ video: true })
            .then(function (stream) {
                video.srcObject = stream;
                isDetecting = true;
                processVideo();
            })
            .catch(function (error) {
                debugInfo.textContent = '无法访问摄像头: ' + error.message;
            });
    } else {
        debugInfo.textContent = '浏览器不支持摄像头访问';
    }
}

function stopDetection() {
    isDetecting = false;
    if (animationId) {
        cancelAnimationFrame(animationId);
        animationId = null;
    }
    if (video.srcObject) {
        video.srcObject.getTracks().forEach(track => track.stop());
        video.srcObject = null;
    }
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    debugInfo.textContent = '检测已停止';
}

function processVideo() {
    if (!isDetecting) return;

    const tempCanvas = document.createElement('canvas');
    const tempCtx = tempCanvas.getContext('2d');

    // 水平翻转视频帧
    tempCtx.translate(tempCanvas.width, 0);
    tempCtx.scale(-1, 1);
    tempCtx.drawImage(video, 0, 0, tempCanvas.width, tempCanvas.height);

    // 重置变换
    tempCtx.setTransform(1, 0, 0, 1, 0, 0);

    // 获取图像数据
    const imageData = tempCtx.getImageData(0, 0, tempCanvas.width, tempCanvas.height);
    const data = imageData.data;

    // 分析亮光位置
    const result = analyzeBrightness(data, tempCanvas.width, tempCanvas.height);

    // 在canvas上绘制结果（也需要翻转）
    drawResult(result, tempCanvas.width);


    // 更新调试信息
    debugInfo.textContent = `亮光方向: ${result.angle.toFixed(1)}° | 亮度: ${result.maxBrightness.toFixed(1)}`;

    // 继续处理下一帧
    animationId = requestAnimationFrame(processVideo);
}

function analyzeBrightness(data, width, height) {
    // 定义分割的块数
    const gridSize = 50;
    const blockWidth = Math.floor(width / gridSize);
    const blockHeight = Math.floor(height / gridSize);

    let maxBrightness = 0;
    let brightestX = 0;
    let brightestY = 0;

    // 分析每个块的亮度
    for (let y = 0; y < gridSize; y++) {
        for (let x = 0; x < gridSize; x++) {
            let brightness = 0;
            let pixelCount = 0;

            // 计算当前块的亮度
            for (let blockY = 0; blockY < blockHeight; blockY++) {
                for (let blockX = 0; blockX < blockWidth; blockX++) {
                    const pxX = x * blockWidth + blockX;
                    const pxY = y * blockHeight + blockY;

                    if (pxX >= width || pxY >= height) continue;

                    const index = (pxY * width + pxX) * 4;
                    const r = data[index];
                    const g = data[index + 1];
                    const b = data[index + 2];

                    // 计算像素亮度 (使用加权平均值)
                    const pixelBrightness = (r * 0.299 + g * 0.587 + b * 0.114);
                    brightness += pixelBrightness;
                    pixelCount++;
                }
            }

            // 计算平均亮度
            if (pixelCount > 0) {
                brightness /= pixelCount;

                // 更新最亮区域
                if (brightness > maxBrightness) {
                    maxBrightness = brightness;
                    brightestX = x * blockWidth + blockWidth / 2;
                    brightestY = y * blockHeight + blockHeight / 2;
                }
            }
        }
    }

    // 计算中心点
    const centerX = width / 2;
    const centerY = height / 2;

    // 计算角度 (0°为正右方，90°为正上方)
    const dx = brightestX - centerX;
    const dy = brightestY - centerY;
    let angle = Math.atan2(dy, dx) * (180 / Math.PI);

    // 确保角度在0-360之间
    if (angle < 0) angle += 360;

    return {
        brightestX,
        brightestY,
        centerX,
        centerY,
        angle,
        maxBrightness
    };
}

function drawResult(result) {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // 绘制中心点
    ctx.beginPath();
    ctx.arc(result.centerX, result.centerY, 10, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(255, 0, 0, 0.4)';
    ctx.fill();

    // 绘制亮光点
    ctx.beginPath();
    ctx.arc(result.brightestX, result.brightestY, Math.abs(result.maxBrightness - 200), 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(255, 255, 0, 0.4)';
    ctx.fill();

    // 绘制方向线
    ctx.beginPath();
    ctx.moveTo(result.centerX, result.centerY);
    ctx.lineTo(result.brightestX, result.brightestY);
    ctx.strokeStyle = 'rgba(0, 255, 0, 0.7)';
    ctx.lineWidth = 3;
    ctx.stroke();

    // 绘制角度文本
    ctx.font = '20px 宋体';
    ctx.fillStyle = 'white';
    ctx.textAlign = 'center';
    ctx.fillText(`${result.angle.toFixed(1)}°`, result.centerX, result.centerY - 20);
}