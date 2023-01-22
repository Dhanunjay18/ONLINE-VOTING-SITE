/* eslint-disable no-unused-vars */
const express = require("express");
const app = express();
const {
  Admin,
  Elections,
  Questions,
  Voters,
  Answers,
  Votes,
} = require("./models");
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
  "admin",
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

passport.use(
  "voter",
  new LocalStrategy(
    {
      usernameField: "vid",
      passwordField: "password",
      passReqToCallback: true,
    },
    (request, username, password, done) => {
      console.log("Came p.use voter", username, "    ", password);
      console.log(request.params.eid);
      Voters.findOne({ where: { vid: username, eid: request.params.eid } })
        .then(async function (voter) {
          const result = await bcrypt.compare(voter.password, password);
          console.log(voter.password, "  Password");
          console.log("Result ", result);
          if (voter.password === password) {
            return done(null, voter);
          } else {
            return done(null, false, { message: "Invalid password" });
          }
        })
        .catch((error) => {
          return done(null, false, { message: "Voter not Exists" });
        });
    }
  )
);

passport.serializeUser((user, done) => {
  console.log("Serializeing user in session ", user.id);
  let temp;
  if (Object.getPrototypeOf(user) === Voters.prototype) {
    temp = "Voter";
  } else if (Object.getPrototypeOf(user) === Admin.prototype) {
    temp = "Admin";
  }
  done(null, { id: user.id, currUser: temp });
});

passport.deserializeUser(async ({ id, currUser }, done) => {
  console.log("Curr User", currUser);
  if (currUser === "Admin") {
    await Admin.findByPk(id)
      .then((user) => {
        done(null, user);
      })
      .catch((error) => {
        done(error, null);
      });
  } else if (currUser === "Voter") {
    await Voters.findByPk(id)
      .then((user) => {
        done(null, user);
      })
      .catch((error) => {
        done(error, null);
      });
  }
});

app.get("/", async function (request, response) {
  let booool = false;
  if (request.user) {
    booool = true;
  }
  response.render("index", {
    loginStatus: booool,
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
        loginStatus: request.user,
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

function ensureLoggedInVoter(request, response, next) {
  const temp = connectEnsureLogin.ensureLoggedIn(
    `/launch/${request.params.eid}`
  );
  return temp(request, response, next);
}

app.get(
  "/launch/:eid/vote",
  ensureLoggedInVoter,
  async function (request, response) {
    console.log("came /launch/eid/vote");
    const loggedInVoter = request.user.id;
    console.log("Voter is : ", loggedInVoter);
    const election = await Elections.findOne({
      where: { id: request.params.eid },
    });
    const questions = await Questions.findAll({
      where: { eid: request.params.eid },
    });
    let answers = [];
    for (var i = 0; i < questions.length; ++i) {
      answers.push(await Answers.findAll({ where: { qid: questions[i].id } }));
    }
    const voter = await Voters.findOne({ where: { id: loggedInVoter } });
    const voterStatus =
      (await Votes.findOne({ where: { vid: loggedInVoter } })) === null
        ? false
        : true;
    if (request.accepts("html")) {
      response.render("votes", {
        voter,
        election,
        answers,
        questions,
        voterStatus,
        loginStatus: request.user,
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
    const question = await Questions.findOne({
      where: { id: request.params.qid },
    });
    const answers = await Answers.findAll({
      where: { qid: request.params.qid },
    });
    console.log(question.title);
    if (request.accepts("html")) {
      response.render("answers", {
        answers,
        question,
        loginStatus: request.user,
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
  "/questions/:qid",
  connectEnsureLogin.ensureLoggedIn(),
  async (request, response) => {
    const qid = request.params.qid;
    if (request.body.name.length === 0) {
      request.flash("error", "Enter a Non Blank Answer");
      return response.redirect(`/questions/${qid}`);
    }
    const val = await Answers.findOne({
      where: {
        title: request.body.name,
        qid: request.params.qid,
      },
    });
    if (val != null) {
      request.flash("error", "Answer Already there!");
      return response.redirect(`/questions/${qid}`);
    }
    const loggedInUser = request.user.id;
    try {
      await Answers.create({
        title: request.body.name,
        qid: request.params.qid,
      });
      return response.redirect(`/questions/${qid}`);
    } catch (error) {
      console.log(error);
      return response.redirect(`/questions/${qid}`);
    }
  }
);

app.delete(
  "/questions/:id",
  connectEnsureLogin.ensureLoggedIn(),
  async function (request, response) {
    try {
      await Answers.destroy({ where: { qid: request.params.id } });
      await Questions.destroy({ where: { id: request.params.id } });
      return response.json({ success: true });
    } catch (error) {
      return response.status(422).json(error);
    }
  }
);

app.delete(
  "/answers/:id",
  connectEnsureLogin.ensureLoggedIn(),
  async function (request, response) {
    console.log("We have to delete a Answer with ID: ", request.params.id);
    try {
      const res = await Answers.destroy({ where: { id: request.params.id } });
      return response.json({ success: true });
    } catch (error) {
      return response.status(422).json(error);
    }
  }
);

app.get(
  "/elections/:eid/questions",
  connectEnsureLogin.ensureLoggedIn(),
  async function (request, response) {
    const loggedInAdmin = request.user.id;
    const eid = request.params.eid;
    const election = await Elections.findOne({ where: { id: eid } });
    if (request.accepts("html")) {
      response.render("newQuestion", {
        election,
        eid,
        title: "Create Question",
        loginStatus: request.user,
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
  "/elections/:eid/voters",
  connectEnsureLogin.ensureLoggedIn(),
  async function (request, response) {
    const loggedInAdmin = request.user.id;
    const eid = request.params.eid;
    const election = await Elections.getElections(loggedInAdmin);
    const voters = await Voters.findAll({ where: { eid: eid } });
    if (request.accepts("html")) {
      response.render("newVoter", {
        election,
        eid,
        voters,
        title: "Add Voter",
        loginStatus: request.user,
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

app.post(
  "/elections/:eid/voters",
  connectEnsureLogin.ensureLoggedIn(),
  async (request, response) => {
    const eid = request.params.eid;
    console.log("Entered into ", eid);
    if (request.body.vid.length === 0 || request.body.vpass.length === 0) {
      request.flash("error", "Enter a Valid Voter ID and Password");
      return response.redirect(`/elections/${eid}/voters`);
    }
    const val = await Voters.findOne({
      where: {
        vid: request.body.vid,
        eid: request.params.eid,
      },
    });
    if (val != null) {
      request.flash("error", "Voter Already Exists");
      return response.redirect(`/elections/${eid}/voters`);
    }
    const loggedInUser = request.user.id;
    try {
      await Voters.create({
        vid: request.body.vid,
        password: request.body.vpass,
        eid: request.params.eid,
      });
      return response.redirect(`/elections/${eid}/voters`);
    } catch (error) {
      console.log(error);
      return response.redirect(`/elections/${eid}/voters`);
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
        loginStatus: request.user,
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
    console.log("Descriptoin ", request.body.desc);
    if (request.body.name.length === 0 || request.body.desc.length === 0) {
      request.flash("error", "Fill both Title and Description");
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
        description: request.body.desc,
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

app.get("/elections/:eid",
  connectEnsureLogin.ensureLoggedIn(),
  async function (request, response) {
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
      loginStatus: request.user,
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

app.get(
  "/elections/:eid/preview",
  connectEnsureLogin.ensureLoggedIn(),
  async function (request, response) {
    const election = await Elections.findOne({
      where: { id: request.params.eid },
    });
    const questions = await Questions.findAll({
      where: { eid: request.params.eid },
    });
    const answers = await Answers.findAll();
    const voters = await Voters.findAll({ where: { eid: request.params.eid } });
    if (request.accepts("html")) {
      response.render("preview", {
        election,
        answers,
        questions,
        voters,
        title: "Preview Election",
        name: request.user.email,
        loginStatus: request.user,
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
  "/launch/:eid",
  connectEnsureLogin.ensureLoggedIn(),
  async function (request, response) {
    const election = await Elections.findOne({
      where: { id: request.params.eid },
    });
    const questions = await Questions.findAll({
      where: { eid: request.params.eid },
    });
    let answers = [];
    for (var i = 0; i < questions.length; ++i) {
      answers.push(await Answers.findAll({ where: { qid: questions[i].id } }));
      console.log(answers[i]);
    }
    if (request.accepts("html")) {
      response.render("launch", {
        election,
        answers,
        questions,
        title: "Welcome Election",
        name: request.user.email,
        loginStatus: request.user,
        csrfToken: request.csrfToken(),
      });
    } else {
      response.json({
        elections,
      });
    }
  }
);

app.post("/launch/:eid", ensureLoggedInVoter, async (request, response) => {
  try {
    Object.keys(request.body).forEach(async (answer) => {
      console.log(answer, "-----------------------");
      if (answer.indexOf("qid-") != -1) {
        // splitting the name to get values
        const key = answer.split("-");
        const len = key.length;
        console.log(key, "   ->   ", request.body[answer]);
        await Votes.create({
          qid: key[len - 1],
          eid: request.params.eid,
          vid: request.body.vid,
          aid: request.body[answer],
        });
      }
    });
    response.render("votes", {
      voterStatus: true,
      csrfToken: request.body._csrf,
    });
  } catch (error) {
    console.log(error);
  }
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
  passport.authenticate("admin", {
    failureRedirect: "/login",
    failureFlash: true,
  }),
  function (request, response) {
    console.log(request.user);
    response.redirect("/elections");
  }
);

app.post(
  "/session/:eid",
  function (request, response, next) {
    const temp = passport.authenticate("voter", {
      failureFlash: true,
      failureRedirect: `/launch/${request.params.eid}`,
    });
    console.log("Came");
    return temp(request, response, next);
  },
  (request, response) => {
    console.log(request.user);
    response.redirect(`/launch/${request.params.eid}/vote`);
  }
);

module.exports = app;
