'use strict';

const express = require('express');
const morgan = require('morgan'); // logging middleware
const cors = require('cors');
const { check, validationResult } = require('express-validator'); // validation middleware
const dayjs = require('dayjs');

const passport = require('passport'); // auth middleware
const LocalStrategy = require('passport-local'); // username and password for login

const base32 = require('thirty-two');
const TotpStrategy = require('passport-totp').Strategy; // totp

const session = require('express-session'); // enable sessions

const dao = require('./dao'); // module for accessing the DB of ingredients
const userDao = require('./dao-user'); // module for accessing the user info in the DB

// init express
const app = express();
const port = 3001;

const corsOptions = {
  origin: 'http://localhost:5173',
  credentials: true,
};
app.use(cors(corsOptions));

// set-up the middlewares
app.use(morgan('dev'));
app.use(express.json()); // To automatically decode incoming json

/*** Set up Passport ***/
// set up the "username and password" login strategy
// by setting a function to verify username and password
passport.use(new LocalStrategy(
  function (username, password, done) {
    userDao.getUser(username, password).then((user) => {
      if (!user)
        return done(null, false, { message: 'Incorrect username or password.' });

      return done(null, user);
    })
  }
));

// serialize and de-serialize the user (user object <-> session)
// we serialize only the user id and store it in the session
passport.serializeUser((user, done) => {
  done(null, user.id);
});

// starting from the data in the session, we extract the current (logged-in) user
passport.deserializeUser((id, done) => {
  userDao.getUserById(id)
    .then(user => {
      done(null, user); // this will be available in req.user
    }).catch(err => {
      done(err, null);
    });
});

// Set up the TOTP login strategy
passport.use(new TotpStrategy(
  function (user, done) {
    // In case .secret does not exist, decode() will return an empty buffer
    return done(null, base32.decode(user.secret), 30);  // 30 = period of key validity
  })
);


// custom middleware: check if a given request is coming from an authenticated user
const isLoggedIn = (req, res, next) => {
  if (req.isAuthenticated())
    return next();
  return res.status(401).json({ error: 'Not authenticated' });
}

// middleware for TOTP
function isTotp(req, res, next) {
  if (req.session.method === 'totp')
    return next();
  return res.status(401).json({ error: 'Missing TOTP authentication' });
}

// set up the session
app.use(session({
  // by default, Passport uses a MemoryStore to keep track of the sessions
  secret: 'th47yolewrn6uja8ot',   // secret value
  resave: false,
  saveUninitialized: false
}));

// then, init passport
app.use(passport.initialize());
app.use(passport.session());


/*** APIs ***/
// GET /api/sizes
app.get('/api/sizes', (req, res) => {
  dao.getSizes()
    .then(sizes => res.json(sizes))
    .catch((err) => { console.log(err); res.status(500).json({ error: `Database error while retrieving the sizes list.` }); });
});

// GET /api/bases
app.get('/api/bases', (req, res) => {
  dao.getBases()
    .then(bases => res.json(bases))
    .catch((err) => { console.log(err); res.status(500).json({ error: `Database error while retrieving the bases list.` }); });
});

// GET /api/ingredients
app.get('/api/ingredients', (req, res) => {
  dao.getIngredients()
    .then(ingredients => res.json(ingredients))
    .catch((err) => { console.log(err); res.status(500).json({ error: `Database error while retrieving the ingredients list.` }); });
});

// GET /api/orders
app.get('/api/orders', isLoggedIn, (req, res) => {
  dao.getOrders(req.user.id)
    .then(orders => res.json(orders))
    .catch((err) => { console.log(err); res.status(500).json({ error: `Database error while retrieving the orders list.` });});
});

// POST /api/orders
app.post('/api/orders', isLoggedIn, [
  check('price').isFloat({ min: 0 }), // check that the price is a positive float
  check('base').isLength({ min: 1 }),  // check that the base is not empty
  check('size').isLength({ min: 1 }), // check that the size is not empty
  check('ingredients').isArray() // check that the ingredients list is an array (it may be empty)
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(422).json({ errors: errors.array() });
  }

  const order = {
    base: req.body.base,
    size: req.body.size,
    ingredients: req.body.ingredients,
    price: req.body.price,
    date: dayjs().toISOString(), // generate the date directly on the server
    userId: req.user.id  // get the id from the session
  };

  // Perform checks that data are correct
  let serverPrice = 0; // To recompute the price

  try {
    const base = await dao.getBaseByName(order.base);
    const size = await dao.getSizeByName(order.size);
    const ingredients = await dao.getIngredients();

    // Check that the base is in the DB
    if (base === undefined) {
      return res.status(422).json({ error: `This base dish does not exist.` });
    }

    // Check that the base is in the DB
    if (size === undefined)
      return res.status(422).json({ error: `This size of dish does not exist.` });
    // Check that the number of ingredients is consistent with the chosen size
    if (order.ingredients.length > size.maxIngredients)
      return res.status(422).json({ error: `Too many ingredients selected.` });

    serverPrice += size.price; // update the price

    // Check that the same ingredient is not chosen twice
    const duplicates = order.ingredients.filter((item, index) => order.ingredients.indexOf(item) !== index);
    if (duplicates.length != 0)
      return res.status(422).json({ error: `An ingredient cannot be chosen twice.` });

    // Check that selected ingredients are correct
    let dbIngredient;
    for (let ingredient of order.ingredients) {
      dbIngredient = ingredients.find(e => e.name === ingredient);

      // Check that the ingredients are in the DB
      if (dbIngredient === undefined)
        return res.status(422).json({ error: `The ingredient ${ingredient} does not exist.` });

      // Check that the selected ingredient is still available
      // The availability check is also repeated directly in the DB during the add operation (another order can still have been processed in this small time window)
      if (dbIngredient.quantity && dbIngredient.quantity <= 0)
        return res.status(422).json({ error: `One of the chosen ingredients (${ingredient}) is no more available.` });

      // Check the required ingredient is among the other ingredients
      if (dbIngredient.requires != null && !(order.ingredients.includes(dbIngredient.requires)))
        return res.status(422).json({ error: `A required ingredient is missing: ${dbIngredient.name} -> ${dbIngredient.requires}.` });

      // Check that incompatible ingredients are not in the list
      for (let incompatible of dbIngredient.incompatibilities) {
        if (order.ingredients.includes(incompatible))
          return res.status(422).json({ error: `Incompatible ingredients present in the list: ${dbIngredient.name} incompatible with ${incompatible}.` });
      }

      serverPrice += dbIngredient.price; // update the price
    }

    // Verify that the price computed by the client and by the server are equal
    // Since they are float we check that the difference is below a certain threshold
    if (Math.abs(serverPrice - order.price) > 0.001)
      return res.status(422).json({ error: `Wrong price` });

    // Try to add the new order to the database
    const newOrder = await dao.createOrder(order);
    res.status(201).json(newOrder);
  } catch (err) {
    console.log("Error: ", err);
    if (err.code === "NOT_AVAILABLE")
      return res.status(422).json({ error: err.msg });
    else
      return res.status(500).json({ error: `Database error during the creation of order.` });
  }
});

// DELETE /api/orders/:id
app.delete('/api/orders/:id', isLoggedIn, isTotp, [
  check('id').isInt({min: 0}) // check that the order id is a positive integer
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(422).json({ errors: errors.array() });
  }
  try {
    const numRowChanges = await dao.deleteOrder(req.params.id, req.user.id);
    // If no element has the specified id, the delete operation is successful:
    // in that case, the numRowChanges is equal to zero.
    return res.status(200).json({numRowChanged: numRowChanges});
  } catch (err) {
    console.log("Error: ", err);
    res.status(500).json({ error: `Database error during the deletion of order ${req.params.id}.` });
  }
});

// User APIs (login)
function clientUserInfo(req) {
  const user = req.user;
  return { id: user.id, username: user.username, name: user.name, isTotp: req.session.method === 'totp' };
}

// POST /api/sessions
app.post('/api/sessions', function (req, res, next) {
  passport.authenticate('local', (err, user, info) => {
    if (err)
      return next(err);
    if (!user) {
      // display wrong login messages
      return res.status(401).json(info);
    }
    // success, perform the login
    req.login(user, (err) => {
      if (err)
        return next(err);

      return res.status(201).json(clientUserInfo(req));
    });
  })(req, res, next);
});

// POST /api/loging-totp
app.post('/api/login-totp', isLoggedIn,
  passport.authenticate('totp'),   // passport expect the totp value to be in: body.code
  function (req, res) {
    req.session.method = 'totp';
    res.json({ otp: 'authorized' });
  }
);

// GET /api/sessions/current
// check whether the user is logged in or not
app.get('/api/sessions/current', (req, res) => {
  if (req.isAuthenticated()) {
    res.status(200).json(clientUserInfo(req));
  }
  else
    res.status(401).json({ error: 'Unauthenticated user!' });;
});

// DELETE /sessions/current
// logout
app.delete('/api/sessions/current', (req, res) => {
  req.logout( (err)=> {
    if (err)
      return res.status(500).json({ error: `Error during logout.` });
    res.end();
  } );
});

// activate the server
app.listen(port, (err) => {
  if (err)
    console.log(err);
  else
    console.log(`Server listening at http://localhost:${port}`);
});
