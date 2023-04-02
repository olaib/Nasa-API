var createError = require('http-errors');
var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var logger = require('morgan');

var indexRouter = require('./routes/index');
var apiRouter = require('./routes/api');

var app = express();

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

// enable session db
var Sequelize = require('sequelize')
var session = require('express-session');
var SequelizeStore = require('connect-session-sequelize')(session.Store);

var sequelize = new Sequelize({
  "dialect": "sqlite",
  "storage": "./session.sqlite3"
});

var myStore = new SequelizeStore({
  db: sequelize
});

// enable session
app.use(session({
  store: myStore,
  secret: 'keyboard cat',
  resave: false,
  saveUninitialized: true
}));

myStore.sync();

app.use((req, res, next) => {
  res.set('catch-control', 'no-cache', 'private', 'no-store', 'must-relative', 'max-stale=0',
      'pre-check=0', 'max-age=0', 's-max-age=0');
  next();
})

app.use('/', indexRouter);

app.use('/api', apiRouter);

// catch 404 and forward to error handler
app.use(function(req, res, next) {
  next(createError(404));
});

// error handler
app.use(function(err, req, res, next) {

  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};
  if(err.status === 404){
    return res.render('404');
  }
  // render the error page
  res.status(err.status || 500);
  res.render('error');
});

const PORT = 3000 | process.env.PORT
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}.`);
});

module.exports = app;