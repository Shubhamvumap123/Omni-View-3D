const mongoose = require('mongoose');

const AssetSchema = new mongoose.Schema({
  title: { type: String, required: true },
  originalFilename: String,
  fileSize: Number,
  format: { type: String, enum: ['stl', 'ply', '3mf', 'step'] },

  // Storage Paths (References to GridFS files)
  originalFileId: { type: mongoose.Schema.Types.ObjectId, ref: 'fs.files' },
  renderableFileId: { type: mongoose.Schema.Types.ObjectId, ref: 'fs.files' },

  // Processing Status
  status: { type: String, enum: ['pending', 'processing', 'ready', 'failed'], default: 'ready' },

  uploadDate: { type: Date, default: Date.now }
});

const AnnotationSchema = new mongoose.Schema({
  assetId: { type: mongoose.Schema.Types.ObjectId, ref: 'ModelAsset', required: true },
  text: String,

  // The exact 3D coordinate where the user clicked
  position: {
    x: Number,
    y: Number,
    z: Number
  },

  // Camera state to restore the view when clicking the comment
  cameraState: {
    position: [Number],
    target: [Number]
  }
});

const ModelAsset = mongoose.model('ModelAsset', AssetSchema);
const Annotation = mongoose.model('Annotation', AnnotationSchema);

module.exports = { ModelAsset, Annotation };
