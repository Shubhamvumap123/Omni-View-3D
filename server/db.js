const { MongoMemoryServer } = require('mongodb-memory-server');
const mongoose = require('mongoose');

let mongod = null;
let gridfsBucket = null;

async function initDB() {
  if (mongoose.connection.readyState === 1) {
    if (!gridfsBucket) {
      gridfsBucket = new mongoose.mongo.GridFSBucket(mongoose.connection.db, { bucketName: 'fs' });
    }
    return;
  }

  mongod = await MongoMemoryServer.create();
  const uri = mongod.getUri();

  await mongoose.connect(uri);
  console.log('Connected to MongoDB Memory Server');

  gridfsBucket = new mongoose.mongo.GridFSBucket(mongoose.connection.db, { bucketName: 'fs' });
}

function getGridFSBucket() {
  if (!gridfsBucket) {
    // If initDB hasn't finished or was not called, try to init from existing connection if possible
    if (mongoose.connection.readyState === 1) {
       gridfsBucket = new mongoose.mongo.GridFSBucket(mongoose.connection.db, { bucketName: 'fs' });
       return gridfsBucket;
    }
    throw new Error('Database not initialized. Call initDB first.');
  }
  return gridfsBucket;
}

async function closeDB() {
    if (mongod) {
        await mongoose.disconnect();
        await mongod.stop();
        console.log('MongoDB Memory Server stopped');
    }
}

module.exports = { initDB, getGridFSBucket, closeDB };
