const express = require('express');
const { spawn } = require('child_process');
const path = require('path');
const bodyParser = require('body-parser');
const workouts = require('./workouts');
const app = express();
const PORT = process.env.PORT || 8080;

app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, 'dist')));

function errorResponse(res, status, message) {
  return res.status(status).json({ 
    success: false, 
    error: message 
  });
}

app.post('/api/recommend', (req, res) => {
  try {
    const { workoutType, difficultyLevel } = req.body;
    
    // Validate input
    if (!workoutType) {
      return errorResponse(res, 400, 'Workout type is required');
    }
    
    // If selecting "all" workout types
    if (workoutType === 'semua') {
      // Combine all exercises from all categories
      let allWorkouts = [];
      for (const type in workouts) {
        for (const sub in workouts[type]) {
          allWorkouts = [...allWorkouts, ...workouts[type][sub]];
        }
      }
      
      // Filter based on difficulty if specified
      if (difficultyLevel && difficultyLevel !== 'all') {
        const difficultyMap = {
          'beginner': 'Easy',
          'intermediate': 'Medium',
          'advanced': 'Hard'
        };
        allWorkouts = allWorkouts.filter(w => w.kesulitan === difficultyMap[difficultyLevel]);
      }
      
      return res.json({ success: true, recommendations: allWorkouts });
    } else if (workouts[workoutType]) {
      // If selecting a specific type (strength or endurance)
      // Combine all exercises from the selected type
      let typeWorkouts = [];
      for (const sub in workouts[workoutType]) {
        typeWorkouts = [...typeWorkouts, ...workouts[workoutType][sub]];
      }
      
      // Filter based on difficulty if specified
      if (difficultyLevel && difficultyLevel !== 'all') {
        const difficultyMap = {
          'beginner': 'Easy',
          'intermediate': 'Medium',
          'advanced': 'Hard'
        };
        typeWorkouts = typeWorkouts.filter(w => w.kesulitan === difficultyMap[difficultyLevel]);
      }
      
      return res.json({ success: true, recommendations: typeWorkouts });
    } else {
      // If type not found
      return errorResponse(res, 400, 'Invalid workout type');
    }
  } catch (error) {
    console.error('Error in recommend endpoint:', error);
    return errorResponse(res, 500, 'Server error while processing recommendation');
  }
});

// Keeping the old endpoint for backward compatibility
app.post('/recommend', (req, res) => {
  // Forward to the new standardized endpoint
  req.url = '/api/recommend';
  app._router.handle(req, res);
});

app.post('/api/recommendations', (req, res) => {
  const { age, height, weight } = req.body;
  
  if (!age || !height || !weight) {
    return errorResponse(res, 400, 'Missing required fields');
  }
  
  try {
    // Run Python script with input values
    const pythonProcess = spawn('python', [
      'workout_recommendation.py',
      '--age', age.toString(),
      '--height', height.toString(),
      '--weight', weight.toString()
    ]);
    
    let dataString = '';
    
    // Collect data from script
    pythonProcess.stdout.on('data', (data) => {
      dataString += data.toString();
    });
    
    // Handle errors
    pythonProcess.stderr.on('data', (data) => {
      console.error(`Python script error: ${data}`);
    });
    
    // Send response when script finishes
    pythonProcess.on('close', (code) => {
      if (code !== 0) {
        return errorResponse(res, 500, 'Python script execution failed');
      }
      
      try {
        const results = JSON.parse(dataString);
        res.json(results);
      } catch (error) {
        console.error('Error parsing Python output:', error);
        return errorResponse(res, 500, 'Failed to parse Python output');
      }
    });
  } catch (error) {
    console.error('Error executing Python script:', error);
    return errorResponse(res, 500, 'Failed to execute Python script');
  }
});

// Serve index.html for all routes to support SPA routing
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// Start server
app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
  console.log('Using in-memory storage for programs (data will be lost on server restart)');
});
