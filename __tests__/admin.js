const request = require("supertest");
var cheerio = require("cheerio");
const db = require("../models/index");
const app = require("../app");

let server, agent;
function extractCsrfToken(res) {
  var $ = cheerio.load(res.text);
  return $("[name=_csrf]").val();
}

// const login = async (agent, username, password) => {
//   let res = await agent.get("/login");
//   let csrfToken = extractCsrfToken(res);
//   res = await agent.post("/session").send({
//     email: username,
//     password: password,
//     _csrf: csrfToken,
//   });
// };

describe("Voting Application", function () {
  beforeAll(async () => {
    await db.sequelize.sync({ force: true });
    server = app.listen(4000, () => {});
    agent = request.agent(server);
  });

  afterAll(async () => {
    try {
      await db.sequelize.close();
      await server.close();
    } catch (error) {
      console.log(error);
    }
  });

  test("Sign Up", async () => {
    let res = await agent.get("/signup");
    const csrfToken = extractCsrfToken(res);
    res = await agent.post("/admins").send({
      firstName: "test",
      lastName: "User A",
      email: "a@gmail.com",
      password: "12",
      _csrf: csrfToken,
    });
    expect(res.statusCode).toBe(302);
  });

  test("Sign out", async () => {
    let res = await agent.get("/elections");
    expect(res.statusCode).toBe(200);
    res = await agent.get("/signout");
    expect(res.statusCode).toBe(302);
    res = await agent.get("/elections");
    expect(res.statusCode).toBe(302);
  });

  // test("Creates a election and responds with json at /elections POST endpoint", async () => {
  //   const agent = request.agent(server);
  //   await login(agent, "a@gmail.com", "12");
  //   const res = await agent.get("/admins");
  //   const csrfToken = extractCsrfToken(res);
  //   const response = await agent.post("/admins").send({
  //     name: "Classs Monitor",
  //     _csrf: csrfToken,
  //   });
  //   expect(response.statusCode).toBe(302);
  // });
});
