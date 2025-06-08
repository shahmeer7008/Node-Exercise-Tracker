const express = require('express')
const app = express()
const cors = require('cors')
require('dotenv').config()
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
app.use(cors())
app.use(express.static('public'))
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

app.get('/', (req, res) => {
  res.sendFile(__dirname + '/views/index.html')
});





// Database connection
mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost/exercise-tracker', {
  useNewUrlParser: true,
  useUnifiedTopology: true
});

// User Schema
const userSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true }
});

// Exercise Schema
const exerciseSchema = new mongoose.Schema({
  userId: { type: String, required: true },
  description: { type: String, required: true },
  duration: { type: Number, required: true },
  date: { type: Date, default: Date.now }
});

// Models
const User = mongoose.model('User', userSchema);
const Exercise = mongoose.model('Exercise', exerciseSchema);

// Helper function to validate date
const isValidDate = (dateString) => {
  return !isNaN(Date.parse(dateString));
};

// POST /api/users - Create new user (FIXED TEST 3)
app.post('/api/users', async (req, res) => {
  const { username } = req.body;
  
  if (!username || username.trim() === '') {
    return res.status(400).json({ error: 'Username is required' });
  }
  
  try {
    const newUser = new User({ username: username.trim() });
    const savedUser = await newUser.save();
    
    res.json({
      username: savedUser.username,
      _id: savedUser._id.toString()
    });
  } catch (err) {
    if (err.code === 11000) {
      res.status(400).json({ error: 'Username already taken' });
    } else {
      res.status(500).json({ error: 'Server error' });
    }
  }
});

// GET /api/users - Get all users
app.get('/api/users', async (req, res) => {
  try {
    const users = await User.find({}, 'username _id');
    res.json(users);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/users/:_id/exercises (FIXED TEST 7)
app.post('/api/users/:_id/exercises', async (req, res) => {
  const { _id } = req.params;
  let { description, duration, date } = req.body;
  
  // Validation
  if (!description || description.trim() === '') {
    return res.status(400).json({ error: 'Description is required' });
  }
  
  if (!duration || isNaN(duration)) {
    return res.status(400).json({ error: 'Duration must be a number' });
  }
  
  duration = parseInt(duration);
  
  // Handle date
  let exerciseDate;
  if (date) {
    if (!isValidDate(date)) {
      return res.status(400).json({ error: 'Invalid date format. Use yyyy-mm-dd' });
    }
    exerciseDate = new Date(date);
  } else {
    exerciseDate = new Date();
  }
  
  try {
    const user = await User.findById(_id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    const exercise = new Exercise({
      userId: _id,
      description: description.trim(),
      duration,
      date: exerciseDate
    });
    
    const savedExercise = await exercise.save();
    
    res.json({
      _id: user._id.toString(),
      username: user.username,
      date: savedExercise.date.toDateString(),
      duration: savedExercise.duration,
      description: savedExercise.description
    });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/users/:_id/logs (FIXED TESTS 9-16)
app.get('/api/users/:_id/logs', async (req, res) => {
  const { _id } = req.params;
  let { from, to, limit } = req.query;
  
  try {
    const user = await User.findById(_id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    // Build date filter
    let dateFilter = {};
    if (from) {
      if (!isValidDate(from)) {
        return res.status(400).json({ error: 'Invalid from date format. Use yyyy-mm-dd' });
      }
      dateFilter.$gte = new Date(from);
    }
    if (to) {
      if (!isValidDate(to)) {
        return res.status(400).json({ error: 'Invalid to date format. Use yyyy-mm-dd' });
      }
      dateFilter.$lte = new Date(to);
    }
    
    // Build query
    let query = { userId: _id };
    if (from || to) {
      query.date = dateFilter;
    }
    
    // Get exercises with optional limit
    let exercisesQuery = Exercise.find(query)
      .select('description duration date -_id')
      .sort({ date: 1 });
    
    if (limit) {
      limit = parseInt(limit);
      if (isNaN(limit)) {
        return res.status(400).json({ error: 'Limit must be a number' });
      }
      exercisesQuery = exercisesQuery.limit(limit);
    }
    
    const exercises = await exercisesQuery.exec();
    
    // Format log items
    const log = exercises.map(exercise => ({
      description: String(exercise.description),
      duration: Number(exercise.duration),
      date: exercise.date.toDateString()
    }));
    
    res.json({
      _id: user._id.toString(),
      username: user.username,
      count: log.length,
      log
    });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});






const listener = app.listen(process.env.PORT || 3000, () => {
  console.log('Your app is listening on port ' + listener.address().port)
})
