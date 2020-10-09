const express = require("express");
const csurf = require('csurf');
const cookieParser = require('cookie-parser');
const csrfProtection = csurf({ cookie: true });

const questionsRoute = require('./routes/api/questions');
const { searchRouter } = require('./routes/api/search');
const usersRouter = require("./routes/api/users");
const db = require('./db/models');
const { User, Question, Answer, Vote } = db;
const morgan = require("morgan");
const { environment, model, cookieConfig, jwtConfig } = require('./config');
const { secret, expiresIn } = jwtConfig;

//prevent tinymce from allowing <script> tags to be inserted by malicious users
const sanitizer = require('express-html-sanitizer');
config = {
  allowedTags: ['u', 'b', 'i', 'em', 'strong', 'a', 'code', 'p', 'h1', 'h2', 'h3', 'h4', 'ul', 'li', 'ol' ],
  allowedAttributes: {'a' : [ 'href' ] }
}

const sanitizeReqBody = sanitizer(config);


const app = express();

const path = require('path');
app.use(express.static(path.join(__dirname, '/public')));

const bearerToken = require('express-bearer-token');
const { checkAuth } = require("./auth.js");



app.set('view engine', 'pug');

app.use(cookieParser(cookieConfig));
app.use(morgan("dev"));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(bearerToken({
  cookie: {
    signed: true,
    secret,
    key: "access_token",
  }
}));
app.use(sanitizeReqBody);

app.use('/search', searchRouter);
app.use("/users", usersRouter);
app.use("/questions", questionsRoute);

app.get('/', (req, res) => {
  res.render('banner')
})

app.get('/login', (req, res) => {
  res.render('login');
})

app.get('/signup', (req, res) => {
  res.render('signup');
})

app.get('/users', async (req, res) => {
  const users = await User.findAll();
  res.render('users', { users });
})

app.get('/main', checkAuth, async (req, res) => {
  const topQuestions = await Question.findAll({ limit: 10, order: [['createdAt', 'DESC']] });
  // const signedIn = true;
  // if (window.localStorage.getItem("COREDUMP_ACCESS_TOKEN") && window.localStorage.getItem("COREDUMP_CURRENT_USER_ID")) signedIn = !signedIn;
  console.log(req.user)
  res.render('main', { topQuestions, signedIn: req.user })
})


app.get('/postQuestion', csrfProtection, (req, res) => {
  let csrfToken = req.csrfToken();
  res.render('add-question', { csrfToken })
})
// Catch unhandled requests and forward to error handler.
app.use((req, res, next) => {
  const err = new Error("The requested resource couldn't be found.");
  err.status = 404;
  next(err);
});

// Custom error handlers.

// Generic error handler.
app.use((err, req, res, next) => {
  res.status(err.status || 500);
  const isProduction = environment === "production";
  console.log(err);
  res.json({
    title: err.title || "Server Error",
    message: err.message,
    errors: err.errors,
    stack: isProduction ? null : err.stack,
  });
});

module.exports = app;
