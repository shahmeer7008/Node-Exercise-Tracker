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
mongoose.connect('mongodb://localhost:27017/FreeCodeCamp', {
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

// Routes

// Create a new user
app.post('/api/users', async (req, res) => {
  try {
    const { username } = req.body;
    
    if (!username) {
      return res.status(400).json({ error: 'Username is required' });
    }
    
    const newUser = new User({ username });
    const savedUser = await newUser.save();
    
    res.json({ username: savedUser.username, _id: savedUser._id });
  } catch (err) {
    if (err.code === 11000) {
      res.status(400).json({ error: 'Username already taken' });
    } else {
      res.status(500).json({ error: 'Server error' });
    }
  }
});

// Get all users
app.get('/api/users', async (req, res) => {
  try {
    const users = await User.find({}, 'username _id');
    res.json(users);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Add exercise
app.post('/api/users/:_id/exercises', async (req, res) => {
  try {
    const { _id } = req.params;
    let { description, duration, date } = req.body;
    
    // Validate required fields
    if (!description || !duration) {
      return res.status(400).json({ error: 'Description and duration are required' });
    }
    
    // Check if user exists
    const user = await User.findById(_id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    // Parse date or use current date
    const exerciseDate = date ? new Date(date) : new Date();
    
    // Create new exercise
    const newExercise = new Exercise({
      userId: _id,
      description,
      duration: parseInt(duration),
      date: exerciseDate
    });
    
    const savedExercise = await newExercise.save();
    
    // Return user object with exercise fields
    res.json({
      _id: user._id,
      username: user.username,
      description: savedExercise.description,
      duration: savedExercise.duration,
      date: savedExercise.date.toDateString()
    });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Get exercise log
app.get('/api/users/:_id/logs', async (req, res) => {
  try {
    const { _id } = req.params;
    const { from, to, limit } = req.query;
    
    // Check if user exists
    const user = await User.findById(_id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    // Build query
    let query = { userId: _id };
    let dateFilter = {};
    
    if (from) dateFilter.$gte = new Date(from);
    if (to) dateFilter.$lte = new Date(to);
    if (from || to) query.date = dateFilter;
    
    // Get exercises
    let exercisesQuery = Exercise.find(query)
      .select('description duration date -_id');
    
    if (limit) exercisesQuery = exercisesQuery.limit(parseInt(limit));
    
    const exercises = await exercisesQuery.exec();
    
    // Format response
    const log = exercises.map(exercise => ({
      description: exercise.description,
      duration: exercise.duration,
      date: exercise.date.toDateString()
    }));
    
    res.json({
      _id: user._id,
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
