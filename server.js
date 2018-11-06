const express = require('express')
const app = express()
const bodyParser = require('body-parser')

const cors = require('cors')

const mongoose = require('mongoose')
mongoose.connect(process.env.MLAB_URI || 'mongodb://localhost/exercise-track' )

app.use(cors())

app.use(bodyParser.urlencoded({extended: false}))
app.use(bodyParser.json())


app.use(express.static('public'))
app.get('/', (req, res) => {
  res.sendFile(__dirname + '/views/index.html')
});


//Define a schema
var Schema = mongoose.Schema;

var UserSchema = new Schema({
    username: {
      type: String,
      required: true
    }
}, { versionKey: false });
// Compile model from schema
var User = mongoose.model('User', UserSchema );

//New user
app.post('/api/exercise/new-user', (req, res) => {
  var user = new User( { username: req.body.username } );
  console.log(req.body);
  user.save(function(err, data){
    if(err){
      res.json(err);
    }
    res.json(data);
  }); 
});

//Get users
app.get('/api/exercise/users', (req, res) => {

  User.find(function(err, data){
    if(err){
      res.json(err);
    }
    res.json(data);
  }); 
  
});

//Define a schema
var ExerciseSchema = new Schema({    
    username: { type: Schema.ObjectId, ref: "User" },
    description: String,
    duration: Number,
    date: Date
}, { versionKey: false });
// Compile model from schema
var Exercise = mongoose.model('Exercise', ExerciseSchema );

//New exercise
app.post('/api/exercise/add', (req, res) => {
  var userReq = {};
  userReq.date = req.body.date;
  userReq.description = req.body.description;
  userReq.duration = req.body.duration;
  userReq.username = req.body.userId;
  //console.log(userReq);
  
  User.findById(userReq.username, function(err, data){
    if(err){
      res.json(err);
    }

    if(data == null){
      res.status(400);
      res.send('unknown _id');
    }else{
      
      if(userReq.date == ''){
        userReq.date = new Date();
      }
      userReq.user = data._id;      
      var exercise = new Exercise( userReq );  
      exercise.save(function(err, data){
        if(err){
          res.json(err);
        }
        User.populate(data, {path: "username"}, function(err, exercisePopulate){
          res.json(exercisePopulate);
        });      
      });
      
    }
  });
    
});


//Get logs
app.get('/api/exercise/log', (req, res) => {  
  
  User.findById(req.query.userId).lean().exec( function(err, user){
    if(err){
      res.json(err);
    }

    if(user == null){
      res.status(400);
      res.send('unknown _id');
    }else{
      //console.log(user);      
      Exercise.find( { username: user._id}, {'_id': false}, function(err, exercises){
        if(err){
          res.json(err);
        }
        //console.log(exercises);
        user.count = exercises.length;
        user.log = [];
        var exercisesFilter = exercises;
        
        if(req.query.from != undefined){
          var from = new Date(req.query.from);
          exercisesFilter = exercisesFilter.filter(item => new Date(item.date) > from);
        }
        
        if(req.query.to != undefined){
          var to = new Date(req.query.to);
          exercisesFilter = exercisesFilter.filter(item => new Date(item.date) < to);
        }
        
        if(req.query.limit != undefined){
          var end = req.query.limit;
          exercisesFilter = exercisesFilter.slice(0, end);    
        }
        
        user.log = exercisesFilter;
        //console.log(exercises.length);        
        //console.log(user);
        res.json(user);
      });
      
    }
    
  });
  
});

// Not found middleware
app.use((req, res, next) => {
  return next({status: 404, message: 'not found'})
})

// Error Handling middleware
app.use((err, req, res, next) => {
  let errCode, errMessage

  if (err.errors) {
    // mongoose validation error
    errCode = 400 // bad request
    const keys = Object.keys(err.errors)
    // report the first validation error
    errMessage = err.errors[keys[0]].message
  } else {
    // generic or custom error
    errCode = err.status || 500
    errMessage = err.message || 'Internal Server Error'
  }
  res.status(errCode).type('txt')
    .send(errMessage)
})

const listener = app.listen(process.env.PORT || 3000, () => {
  console.log('Your app is listening on port ' + listener.address().port)
})