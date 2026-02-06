const fs = require('fs');
const path = require('path');
const { ModelAsset } = require('./models');
const { getGridFSBucket } = require('./db');

const SAMPLE_GLB_PATH = path.join(__dirname, 'samples/sample_converted.glb');

async function processStepFile(assetId) {
  console.log(`[Converter] Starting conversion for asset ${assetId}...`);

  // Simulate processing time
  await new Promise(resolve => setTimeout(resolve, 2000));

  try {
      // In a real app, we would:
      // 1. Get original file from GridFS using asset.originalFileId
      // 2. Spawn a process to convert it
      // 3. Get the result stream

      // Mock: Read the sample GLB file
      if (!fs.existsSync(SAMPLE_GLB_PATH)) {
          console.error('[Converter] Sample GLB not found at', SAMPLE_GLB_PATH);
          await ModelAsset.findByIdAndUpdate(assetId, { status: 'failed' });
          return;
      }

      const readStream = fs.createReadStream(SAMPLE_GLB_PATH);
      const bucket = getGridFSBucket();

      const uploadStream = bucket.openUploadStream(`converted_${assetId}.glb`, {
          metadata: { format: 'glb', originalAssetId: assetId }
      });

      readStream.pipe(uploadStream);

      uploadStream.on('finish', async () => {
          console.log(`[Converter] Conversion complete for ${assetId}. FileId: ${uploadStream.id}`);

          await ModelAsset.findByIdAndUpdate(assetId, {
              status: 'ready',
              renderableFileId: uploadStream.id
          });
      });

      uploadStream.on('error', async (err) => {
          console.error('[Converter] Upload to GridFS failed:', err);
           await ModelAsset.findByIdAndUpdate(assetId, { status: 'failed' });
      });

  } catch (err) {
      console.error('[Converter] Error:', err);
      await ModelAsset.findByIdAndUpdate(assetId, { status: 'failed' });
  }
}

module.exports = { processStepFile };
