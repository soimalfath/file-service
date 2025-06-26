const express = require('express');
const app = express();

// Import the upload router
const uploadRouter = require('./upload');

// Use the upload router for /upload endpoint
app.use('/upload', uploadRouter);

// Example: start the server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
