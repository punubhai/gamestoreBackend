const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const multer = require('multer'); 
const path = require('path'); 
const fs = require('fs'); 

const app = express(); 
require('dotenv').config(); 

// Middleware to parse JSON request bodies 
app.use(express.json()); 
app.use(cors()); 

// Serve static files 
app.use('/files', express.static('files')); 
app.use('/images', express.static('images')); 

// Create directories if they don't exist 
if (!fs.existsSync('./files')) { 
  fs.mkdirSync('./files'); 
} 
if (!fs.existsSync('./images')) { 
  fs.mkdirSync('./images'); 
} 

// MongoDB connection with extended timeout and error handling
const mongoUrl = process.env.MONGO_URI;
mongoose.connect(mongoUrl, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  connectTimeoutMS: 30000, // Increase the connection timeout to 30 seconds
  serverSelectionTimeoutMS: 30000, // Timeout for MongoDB server selection
})
.then(() => console.log('Connected to database'))
.catch((e) => {
  console.error('Database connection error:', e.message);
  console.error('Error stack:', e.stack);
});

// MongoDB connection event handlers
mongoose.connection.on('connected', () => {
  console.log('Mongoose connected to MongoDB');
});
mongoose.connection.on('error', (err) => {
  console.error('Mongoose connection error:', err);
});
mongoose.connection.on('disconnected', () => {
  console.log('Mongoose disconnected from MongoDB');
});

// Load the ApkDetails model with added genre and description fields
const apkDetailsSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
  },
  genre: {
    type: String,
    required: true,
  },
  description: {
    type: String,
    required: true,
  },
  apk: {
    type: String,
    required: true,
  },
  image: {
    type: String,
    required: true,
  },
});

const ApkSchema = mongoose.model('ApkDetails', apkDetailsSchema);

// Multer storage configuration
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    if (file.mimetype === 'application/vnd.android.package-archive') {
      cb(null, './files');
    } else if (file.mimetype.startsWith('image/')) {
      cb(null, './images');
    } else {
      cb(new Error('Invalid file type. Only APK and images are allowed!'));
    }
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + file.originalname;
    cb(null, uniqueSuffix);
  },
});

// File filter to allow only APKs and images
const fileFilter = (req, file, cb) => {
  if (file.mimetype === 'application/vnd.android.package-archive' || file.mimetype.startsWith('image/')) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type. Only APK and images are allowed!'), false);
  }
};

// Multer configuration with file size limits
const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: { fileSize: 200 * 1024 * 1024 }, // Limit file size to 200MB
});

// API to handle file uploads (APK and Image), now with title, genre, and description
app.post('/upload-files', upload.fields([{ name: 'apk' }, { name: 'image' }]), async (req, res) => {
  console.log('Files uploaded:', req.files);
  console.log('Request body:', req.body);

  const { title, genre, description } = req.body;
  const apkFile = req.files['apk'] ? req.files['apk'][0].filename : null;
  const imageFile = req.files['image'] ? req.files['image'][0].filename : null;

  try {
    await ApkSchema.create({ title, genre, description, apk: apkFile, image: imageFile });
    res.send({ status: 'ok', message: 'Files uploaded successfully!' });
  } catch (error) {
    console.error('Error in file upload:', error.message);
    res.status(500).json({ status: 'error', message: 'File upload failed', error: error.message });
  }
});

// API to retrieve all uploaded files
app.get('/get-files', async (req, res) => {
  try {
    const data = await ApkSchema.find({}).limit(10); // Implement pagination
    res.send({ status: 'ok', data: data });
  } catch (error) {
    res.status(500).json({ status: 'error', message: 'Failed to retrieve files', error: error.message });
  }
});

// Base route
app.get('/', (req, res) => {
  res.send('Success!!!!!!');
});

// API to test database connection health
app.get('/test-db', async (req, res) => {
  try {
    await mongoose.connection.db.admin().ping();
    res.send({ status: 'ok', message: 'Database connection is working!' });
  } catch (error) {
    res.status(500).send({ status: 'error', message: 'Database connection failed', error: error.message });
  }
});

// Custom error handler for Multer and other errors
app.use((err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    res.status(500).send({ status: 'error', message: err.message });
  } else if (err) {
    res.status(500).send({ status: 'error', message: err.message });
  }
});

// Start the server
const PORT = process.env.PORT || 5000; 
app.listen(PORT, () => { 
  console.log('Server Started on Port 5000'); 
});
