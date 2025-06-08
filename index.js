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
  date: { type: Date }
});

// Models
const User = mongoose.model('User', userSchema);
const Exercise = mongoose.model('Exercise', exerciseSchema);

// POST /api/users - Create new user
app.post('/api/users', async (req, res) => {
  try {
    const { username } = req.body;
    
    if (!username) {
      return res.status(400).json({ error: 'Username is required' });
    }
    
    const newUser = new User({ username });
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

// POST /api/users/:_id/exercises - Add exercise
app.post('/api/users/:_id/exercises', async (req, res) => {
  try {
    const { _id } = req.params;
    let { description, duration, date } = req.body;
    
    // Validation
    if (!description) {
      return res.status(400).json({ error: 'Description is required' });
    }
    
    if (!duration || isNaN(duration)) {
      return res.status(400).json({ error: 'Duration must be a number' });
    }
    
    duration = parseInt(duration);
    date = date ? new Date(date) : new Date();
    
    if (isNaN(date.getTime())) {
      return res.status(400).json({ error: 'Invalid date' });
    }
    
    const user = await User.findById(_id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    const exercise = new Exercise({
      userId: _id,
      description,
      duration,
      date
    });
    
    const savedExercise = await exercise.save();
    
    res.json({
      _id: user._id,
      username: user.username,
      date: savedExercise.date.toDateString(),
      duration: savedExercise.duration,
      description: savedExercise.description
    });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/users/:_id/logs - Get exercise log
app.get('/api/users/:_id/logs', async (req, res) => {
  try {
    const { _id } = req.params;
    let { from, to, limit } = req.query;
    
    // Validate user exists
    const user = await User.findById(_id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    // Build query
    let query = { userId: _id };
    let dateFilter = {};
    
    // Handle date filters
    if (from) {
      const fromDate = new Date(from);
      if (isNaN(fromDate.getTime())) {
        return res.status(400).json({ error: 'Invalid from date' });
      }
      dateFilter.$gte = fromDate;
    }
    
    if (to) {
      const toDate = new Date(to);
      if (isNaN(toDate.getTime())) {
        return res.status(400).json({ error: 'Invalid to date' });
      }
      dateFilter.$lte = toDate;
    }
    
    if (from || to) {
      query.date = dateFilter;
    }
    
    // Handle limit
    let exercisesQuery = Exercise.find(query);
    if (limit) {
      limit = parseInt(limit);
      if (isNaN(limit)) {
        return res.status(400).json({ error: 'Limit must be a number' });
      }
      exercisesQuery = exercisesQuery.limit(limit);
    }
    
    const exercises = await exercisesQuery.select('description duration date').exec();
    
    // Format response
    const log = exercises.map(ex => ({
      description: ex.description,
      duration: ex.duration,
      date: ex.date.toDateString()
    }));
    
    res.json({
      _id: user._id,
      username: user.username,
      count: exercises.length,
      log
    });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});





const listener = app.listen(process.env.PORT || 3000, () => {
  console.log('Your app is listening on port ' + listener.address().port)
})
