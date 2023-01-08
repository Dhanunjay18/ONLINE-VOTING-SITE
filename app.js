/* eslint-disable no-unused-vars */
const express = require("express");
const app = express();
const { Admin, Elections, Questions, Voters } = require("./models");
const csrf = require("tiny-csrf");
var cookieParser = require("cookie-parser");
const bodyParser = require("body-parser");
const passport = require("passport");
const connectEnsureLogin = require("connect-ensure-login");
const session = require("express-session");
const flash = require("connect-flash");
const LocalStrategy = require("passport-local");
const bcrypt = require("bcrypt");
const saltRounds = 10;
const path = require("path");
const elections = require("./models/elections");
const questions = require("./models/questions");
const { findOne } = require("domutils");
app.set("views", path.join(__dirname, "views"));

app.use(bodyParser.json());
app.set("view engine", "ejs");
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser("Here is the Key"));
app.use(csrf("this_should_be_32_character_long", ["POST", "PUT", "DELETE"]));
app.use(flash());
// app.use(csrf("this_should_be_32_character_long"));

// eslint-disable-next-line no-undef
app.use(express.static(path.join(__dirname, "public")));

app.use(
  session({
    secret: "my-super-secert-key-1234654567987",
    cookie: {
      maxAge: 24 * 60 * 1000,
    },
  })
);

app.use(passport.initialize());
app.use(passport.session());
app.use(function (request, response, next) {
  response.locals.messages = request.flash();
  next();
});
passport.use(
  new LocalStrategy(
    {
      usernameField: "email",
      passwordField: "password",
    },
    (username, password, done) => {
      Admin.findOne({ where: { email: username } })
        .then(async function (user) {
          const result = await bcrypt.compare(password, user.password);
          if (result) {
            return done(null, user);
          } else {
            return done(null, false, { message: "Invalid password" });
          }
        })
        .catch((error) => {
          return done(null, false, { message: "Invalid Username" });
        });
    }
  )
);

passport.serializeUser((user, done) => {
  console.log("Serializeing user in session ", user.id);
  done(null, user.id);
});

passport.deserializeUser((id, done) => {
  Admin.findByPk(id)
    .then((user) => {
      done(null, user);
    })
    .catch((error) => {
      done(error, null);
    });
});

app.get("/", async function (request, response) {
  response.render("index", {
    csrfToken: request.csrfToken(),
  });
});

app.get(
  "/elections",
  connectEnsureLogin.ensureLoggedIn(),
  async function (request, response) {
    const loggedInAdmin = request.user.id;
    const elections = await Elections.getElections(loggedInAdmin);
    console.log(loggedInAdmin);
    if (request.accepts("html")) {
      response.render("elections", {
        elections,
        name: request.user.email,
        csrfToken: request.csrfToken(),
      });
    } else {
      response.json({
        elections,
      });
    }
  }
);

app.get(
  "/questions/:qid",
  connectEnsureLogin.ensureLoggedIn(),
  async function (request, response) {
    const loggedInAdmin = request.user.id;
    const questions = await Questions.getQuestions(loggedInAdmin);
    console.log(loggedInAdmin);
    if (request.accepts("html")) {
      response.render("questions", {
        elections,
        questions,
        name: request.user.email,
        csrfToken: request.csrfToken(),
      });
    } else {
      response.json({
        elections,
      });
    }
  }
);

app.get(
  "/elections/:eid/questions",
  connectEnsureLogin.ensureLoggedIn(),
  async function (request, response) {
    const loggedInAdmin = request.user.id;
    const eid = request.params.eid;
    const election = await Elections.getElections(loggedInAdmin);
    if (request.accepts("html")) {
      response.render("newQuestion", {
        election,
        eid,
        title: "Create Question",
        name: request.user.email,
        csrfToken: request.csrfToken(),
      });
    } else {
      response.json({
        election,
      });
    }
  }
);

app.get(
  "/new",
  connectEnsureLogin.ensureLoggedIn(),
  async function (request, response) {
    const loggedInAdmin = request.user.id;
    const elections = await Elections.getElections(loggedInAdmin);
    if (request.accepts("html")) {
      response.render("new", {
        elections,
        title: "Create Election",
        name: request.user.email,
        csrfToken: request.csrfToken(),
      });
    } else {
      response.json({
        elections,
      });
    }
  }
);

app.post(
  "/new",
  connectEnsureLogin.ensureLoggedIn(),
  async (request, response) => {
    if (request.body.name.length === 0) {
      request.flash("error", "Field not null");
      return response.redirect("/new");
    }
    const val = await Elections.findOne({
      where: {
        name: request.body.name,
        adminId: request.user.id,
      },
    });
    if (val != null) {
      request.flash("error", "Election Already Exists");
      return response.redirect("/new");
    }
    const loggedInUser = request.user.id;
    try {
      await Elections.addElections({
        name: request.body.name,
        adminId: loggedInUser,
      });
      const eid = await Elections.findOne({
        where: {
          name: request.body.name,
          adminId: loggedInUser,
        },
      });
      console.log(eid.id);
      return response.redirect(`/elections/${eid.id}`);
    } catch (error) {
      console.log(error);
      return response.redirect("/new");
    }
  }
);

app.post(
  "/elections/:eid/questions",
  connectEnsureLogin.ensureLoggedIn(),
  async (request, response) => {
    const eid = request.params.eid;
    console.log("Entered into ", eid);
    if (request.body.name.length === 0) {
      request.flash("error", "Enter a Valid Question");
      return response.redirect(`/elections/${eid}/questions`);
    }
    const val = await Questions.findOne({
      where: {
        title: request.body.name,
        eid: request.params.eid,
      },
    });
    if (val != null) {
      request.flash("error", "Question Already Exists");
      return response.redirect(`/elections/${eid}/questions`);
    }
    const loggedInUser = request.user.id;
    try {
      await Questions.create({
        title: request.body.name,
        eid: request.params.eid,
      });
      const qid = await Questions.findOne({
        where: {
          title: JSON.stringify(request.body.name),
          eid: request.params.eid,
        },
      });
      return response.redirect(`/elections/${eid}`);
    } catch (error) {
      console.log(error);
      return response.redirect(`/elections/${eid}/questions`);
    }
  }
);

app.get("/elections/:eid", async function (request, response) {
  const election = await Elections.findOne({
    where: { id: request.params.eid },
  });
  const questions = await Questions.findAll({
    where: {
      eid: request.params.eid,
    },
  });

  if (request.accepts("html")) {
    response.render("questions", {
      elections,
      election,
      questions,
      csrfToken: request.csrfToken(),
    });
  } else {
    response.json({
      elections,
    });
  }
});

app.post(
  "/questions/new",
  connectEnsureLogin.ensureLoggedIn(),
  async (request, response) => {
    const eid = request.params.eid;
    if (request.body.name.length === 0) {
      request.flash("error", "Field not null");
      return response.redirect(`elections/${eid}/questions`);
    }
    const val = await Questions.findOne({
      where: {
        title: request.body.name,
        eid: eid,
      },
    });
    if (val != null) {
      request.flash("error", "Question Already Exists");
      return response.redirect(`elections/${eid}/questions`);
    }
    const loggedInUser = request.user.id;
    try {
      await Questions.createQuestions({
        title: request.body.name,
        eid: eid,
      });
      const qid = await Questions.findOne({
        where: {
          title: request.body.name,
          eid: eid,
        },
      });
      return response.redirect(`/questions/${qid.id}`);
    } catch (error) {
      console.log(error);
      return response.redirect(`elections/${eid}/questions`);
    }
  }
);

app.delete(
  "/elections/:id",
  connectEnsureLogin.ensureLoggedIn(),
  async function (request, response) {
    console.log("We have to delete a Election with ID: ", request.params.id);
    try {
      const res = await Elections.remove(request.params.id, request.user.id);
      return response.json({ success: true });
    } catch (error) {
      return response.status(422).json(error);
    }
  }
);

app.get("/signup", (request, response) => {
  response.render("signup", {
    title: "Signup",
    csrfToken: request.csrfToken(),
  });
});

app.post("/admins", async (request, response) => {
  const hashedPwd = await bcrypt.hash(request.body.password, saltRounds);
  console.log(hashedPwd);
  try {
    const firstNameSize = Object.keys(request.body.firstName).length;
    const lastNameSize = Object.keys(request.body.lastName).length;
    const emailSize = Object.keys(request.body.email).length;
    const passwordSize = Object.keys(request.body.password).length;
    if (
      firstNameSize == 0 ||
      lastNameSize === 0 ||
      emailSize == 0 ||
      passwordSize === 0
    ) {
      request.flash("error", "The fields must not be empty!");
      return response.redirect("/signup");
    }
    const val = await Admin.findOne({ where: { email: request.body.email } });
    if (val != null) {
      request.flash("error", "Email Exists");
      return response.redirect("/signup");
    }
    const admin = await Admin.create({
      firstName: request.body.firstName,
      lastName: request.body.lastName,
      email: request.body.email,
      password: hashedPwd,
    });
    request.login(admin, (err) => {
      if (err) {
        console.log(err);
      }
      return response.redirect("/elections");
    });
  } catch (error) {
    console.log(error);
    return response.redirect("/signup");
  }
});

app.get("/login", async (request, response) => {
  response.render("login", {
    title: "Login",
    csrfToken: request.csrfToken(),
  });
});

app.get("/signout", async (request, response, next) => {
  request.logout((err) => {
    if (err) {
      return next(err);
    }
    response.redirect("/");
  });
});

app.post(
  "/session",
  passport.authenticate("local", {
    failureRedirect: "/login",
    failureFlash: true,
  }),
  function (request, response) {
    console.log(request.user);
    response.redirect("/elections");
  }
);

module.exports = app;
