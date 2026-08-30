import sharp from 'sharp';

const VEHICLE_CLASSES = new Set(['car', 'truck', 'bus', 'motorcycle']);
let modelPromise = null;

async function getModel() {
  if (!modelPromise) {
    modelPromise = Promise.all([
      import('@tensorflow/tfjs'),
      import('@tensorflow-models/coco-ssd'),
    ]).then(async ([tfModule, cocoModule]) => {
      const tf = tfModule.default ?? tfModule;
      const coco = cocoModule.default ?? cocoModule;
      await tf.ready();
      const model = await coco.load({ base: 'lite_mobilenet_v2' });
      return { tf, model };
    });
  }
  return modelPromise;
}

function clampBox(value, minimum, maximum) {
  return Math.max(minimum, Math.min(maximum, Math.round(value)));
}

export async function detectVehicleRegions(imageBuffer, options = {}) {
  if (!Buffer.isBuffer(imageBuffer) || imageBuffer.length === 0) {
    throw new TypeError('Araç tespiti için geçerli bir görsel tamponu gereklidir.');
  }

  const minimumScore = Math.max(0.2, Math.min(0.95, Number(options.minimumScore ?? 0.42)));
  const maximumVehicles = Math.max(1, Math.min(12, Number(options.maximumVehicles ?? 6)));
  const { data, info } = await sharp(imageBuffer, { failOn: 'none' })
    .rotate()
    .removeAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const width = Number(info.width || 0);
  const height = Number(info.height || 0);
  if (!width || !height) return [];

  const { tf, model } = await getModel();
  const tensor = tf.tensor3d(new Uint8Array(data), [height, width, 3], 'int32');
  try {
    const detections = await model.detect(tensor, 20, minimumScore);
    return detections
      .filter((item) => VEHICLE_CLASSES.has(item.class) && Number(item.score || 0) >= minimumScore)
      .sort((a, b) => Number(b.score || 0) - Number(a.score || 0))
      .slice(0, maximumVehicles)
      .map((item, index) => {
        const [rawLeft, rawTop, rawWidth, rawHeight] = item.bbox;
        const paddingX = rawWidth * 0.05;
        const paddingY = rawHeight * 0.05;
        const left = clampBox(rawLeft - paddingX, 0, width - 1);
        const top = clampBox(rawTop - paddingY, 0, height - 1);
        const right = clampBox(rawLeft + rawWidth + paddingX, left + 1, width);
        const bottom = clampBox(rawTop + rawHeight + paddingY, top + 1, height);
        return {
          id: `vehicle_${index + 1}`,
          className: item.class,
          score: Math.round(Number(item.score || 0) * 100),
          box: { left, top, width: right - left, height: bottom - top },
          imageWidth: width,
          imageHeight: height,
        };
      });
  } finally {
    tensor.dispose();
  }
}

export async function createVehicleOcrPasses(imageBuffer, options = {}) {
  const regions = await detectVehicleRegions(imageBuffer, options);
  const passes = [];

  for (const region of regions) {
    const { left, top, width, height } = region.box;
    const vehicle = sharp(imageBuffer, { failOn: 'none' }).rotate().extract({ left, top, width, height });

    // Plaka çoğu yol aracında gövdenin orta-alt bölümündedir. Araç tespiti gerçek ML ile,
    // plaka alt-bölge seçimi ise bilinçli bir aday bölge stratejisiyle yapılır; nihai aidiyet
    // yine insan moderasyonundan geçer.
    const plateTop = Math.floor(height * 0.42);
    const plateHeight = Math.max(1, height - plateTop);
    const crop = await vehicle
      .extract({ left: 0, top: plateTop, width, height: plateHeight })
      .resize({ width: Math.min(2200, Math.max(1200, width * 3)), withoutEnlargement: false })
      .grayscale()
      .normalize()
      .sharpen({ sigma: 1.4 })
      .png()
      .toBuffer();

    passes.push({
      name: `vehicle_region_${region.id}`,
      buffer: crop,
      vehicle: region,
    });
  }

  return passes;
}

export async function closeVehicleDetector() {
  modelPromise = null;
}
