const express = require('express');
const cors = require('cors');
const multer = require('multer');
const mongoose = require('mongoose');
const { initDB, getGridFSBucket } = require('./db');
const { ModelAsset, Annotation } = require('./models');
const { processStepFile } = require('./converter');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// Multer setup (Memory storage for simplicity, stream to GridFS)
const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 50 * 1024 * 1024 } // 50MB limit
});

// Initialize DB
initDB().catch(err => {
    console.error('Failed to init DB:', err);
    process.exit(1);
});

// Routes

// 1. Upload
app.post('/api/upload', upload.single('file'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No file uploaded' });
        }

        const { originalname, size, buffer } = req.file;
        const ext = originalname.split('.').pop().toLowerCase();

        // Determine format
        let format = 'stl'; // default
        if (['stl', 'ply', '3mf', 'step', 'stp'].includes(ext)) {
            format = ext === 'stp' ? 'step' : ext;
        } else {
            return res.status(400).json({ error: 'Unsupported file format' });
        }

        const bucket = getGridFSBucket();

        // Upload original file to GridFS
        const uploadStream = bucket.openUploadStream(originalname, {
            metadata: { format, originalName: originalname }
        });

        uploadStream.end(buffer);

        await new Promise((resolve, reject) => {
            uploadStream.on('finish', resolve);
            uploadStream.on('error', reject);
        });

        const originalFileId = uploadStream.id;

        // Create Asset Record
        const asset = new ModelAsset({
            title: originalname,
            originalFilename: originalname,
            fileSize: size,
            format,
            originalFileId,
            status: format === 'step' ? 'processing' : 'ready',
            renderableFileId: format === 'step' ? null : originalFileId // For mesh, original is renderable
        });

        await asset.save();

        // If STEP, trigger conversion
        if (format === 'step') {
            processStepFile(asset._id); // Async, don't await
        }

        res.status(201).json(asset);

    } catch (err) {
        console.error('Upload error:', err);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

// 2. List Assets
app.get('/api/assets', async (req, res) => {
    try {
        const assets = await ModelAsset.find().sort({ uploadDate: -1 });
        res.json(assets);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// 3. Delete Asset
app.delete('/api/assets/:id', async (req, res) => {
    try {
        const asset = await ModelAsset.findById(req.params.id);
        if (!asset) {
            return res.status(404).json({ error: 'Asset not found' });
        }

        const bucket = getGridFSBucket();

        // Delete original file
        if (asset.originalFileId) {
            await bucket.delete(asset.originalFileId).catch(err => console.warn('Failed to delete original file:', err.message));
        }

        // Delete renderable file if different
        if (asset.renderableFileId && asset.renderableFileId.toString() !== asset.originalFileId.toString()) {
            await bucket.delete(asset.renderableFileId).catch(err => console.warn('Failed to delete renderable file:', err.message));
        }

        // Delete annotations
        await Annotation.deleteMany({ assetId: asset._id });

        // Delete asset record
        await ModelAsset.findByIdAndDelete(req.params.id);

        res.json({ message: 'Asset deleted successfully' });
    } catch (err) {
        console.error('Delete error:', err);
        res.status(500).json({ error: err.message });
    }
});

// 4. Get File Content
app.get('/api/files/:id', (req, res) => {
    try {
        const bucket = getGridFSBucket();
        const _id = new mongoose.Types.ObjectId(req.params.id);

        const downloadStream = bucket.openDownloadStream(_id);

        downloadStream.on('error', (err) => {
            console.error('Stream error', err);
            if (!res.headersSent) {
                res.status(404).json({ error: 'File not found' });
            }
        });

        downloadStream.pipe(res);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// 5. Annotations
app.post('/api/annotations', async (req, res) => {
    try {
        const { assetId, text, position, cameraState } = req.body;
        const annotation = new Annotation({
            assetId, text, position, cameraState
        });
        await annotation.save();
        res.status(201).json(annotation);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.get('/api/annotations/:assetId', async (req, res) => {
    try {
        const annotations = await Annotation.find({ assetId: req.params.assetId });
        res.json(annotations);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
