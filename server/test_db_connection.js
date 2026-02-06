const { initDB, closeDB } = require('./db');
const { ModelAsset, Annotation } = require('./models');

(async () => {
  try {
    await initDB();

    // Test creating a doc
    const asset = new ModelAsset({
        title: 'Test Asset',
        format: 'stl'
    });
    await asset.save();
    console.log('Saved asset:', asset._id);

    const fetched = await ModelAsset.findById(asset._id);
    console.log('Fetched asset:', fetched.title);

    await closeDB();
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
})();
