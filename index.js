const express = require("express");
const app = express();
const methodOverride = require("method-override");
const bodyParser = require("body-parser");
const bcrypt = require("bcrypt");
const session = require("express-session");
const flash = require("express-flash");
const passport = require("passport");

require("./passportConfig")(passport);
require("dotenv").config();

const { Client } = require("pg");

const client = new Client({
  database: "web",
  user: "postgres",
  password: "15372689740.Li", //your password
  host: "localhost", //your host name *name of your machine)
  port: 5432,
});

app.set("view engine", "ejs");
app.use(express.static("public"));
app.use(bodyParser.urlencoded({ extended: false }));
app.use(express.urlencoded({ extended: false }));
app.use(flash());
app.use(
  session({
    secret: "guns,lots of guns",
    resave: false,
    saveUninitialized: false,
  })
);

app.use(passport.initialize());
app.use(passport.session());
app.use(methodOverride("_method"));
connectToClient();
app.listen(process.env.PORT, () => {
  console.log("listening on ", process.env.PORT);
});

//display login page
app.get("/login", (req, res) => {
  res.render("login.ejs");
});
//check users inputs and whether they can login
app.post(
  "/login",
  passport.authenticate("local", {
    successRedirect: "index.html",
    failureRedirect: "/login",
    failureFlash: true,
  })
);
//display register
app.get("/register", (req, res) => {
  res.render("register.ejs");
});
//check register inputs
app.post("/register", async (req, res) => {
  let { name, email, password, password2 } = req.body;

  let errors = [];

  if (!name || !email || !password || !password2) {
    errors.push({ message: "enter all the required fields" });
  }
  if (password != password2) {
    errors.push({ message: "passwords do not match" });
  }

  if (errors.length > 0) {
    res.render("register", { errors });
  }
  //meet the minimum requirment
  else {
    let hashPassword = await bcrypt.hash(password, 10);
    client
      .query("select * from users where email=$1", [email])
      .then((results) => {
        //check if the email is being used
        if (results.rows.length > 0) {
          errors.push({ message: "email is used, please use another one" });
          res.render("register", { errors });
        }
        //otherwise, create a new user
        else {
          client.query(
            "insert into users (name,password,email) values ($1,$2,$3) returning uid,password",
            [name, hashPassword, email]
          );
        }
      })
      .then(() => {
        req.flash("success_msg", "successfully resigtered, you can login now");
        res.redirect("login");
      })
      .catch((err) => {
        console.log("err", err);
        res.redirect("register");
      });
  }
});
//logout
app.delete("/logout", (req, res) => {
  req.logOut();
  res.redirect("/login");
});

//get the current movie list and provide 3 filters
//user must login first in order to see this page
app.get("/search", checkAuthenticated, (req, res) => {
  client
    .query(
      "select mid,movies.name,to_char(release_date,'dd-Mon-yyyy') as release_date,category,directors.name as dn" +
        " from movies,directors where movies.director=directors.did order by mid"
    )
    .then((results) => {
      let records = results.rows;
      records.push(results);

      res.render("search", { records });
    })
    .catch((err) => {
      console.log("err", err);
      res.redirect("/");
    });
});
//search by category
app.post("/search-byca", (req, res) => {
  client
    .query(
      "select mid,movies.name,to_char(release_date,'dd-Mon-yyyy') as release_date,category,directors.name as dn" +
        " from movies,directors where category = $1 and movies.director=directors.did order by mid",
      [req.body.category]
    )
    .then((results) => {
      let records = results.rows;
      records.push(results);

      res.render("search", { records });
    })
    .catch((err) => {
      console.log("err", err);
      res.redirect("/");
    });
});
//search by date
app.post("/search-bydate", (req, res) => {
  client
    .query(
      "select mid,movies.name,to_char(release_date,'dd-Mon-yyyy') as release_date,category,directors.name as dn " +
        "from movies ,directors where movies.director=directors.did order by release_date desc limit 5 "
    )
    .then((results) => {
      let records = results.rows;
      records.push(results);

      res.render("search", { records });
    })
    .catch((err) => {
      console.log("err", err);
      res.redirect("/");
    });
});
//search by director
app.post("/search-byname", (req, res) => {
  client
    .query(
      "select mid,movies.name,to_char(release_date,'dd-Mon-yyyy') as release_date,category,directors.name as dn" +
        " from movies,directors where directors.name = $1 and movies.director=directors.did order by mid",
      [req.body.name]
    )
    .then((results) => {
      let records = results.rows;
      records.push(results);
      res.render("search", { records });
    })
    .catch((err) => {
      console.log("err", err);
      res.redirect("/");
    });
});
//display where the movies are shown
app.get("/location", (req, res) => {
  client
    .query(
      "select playat.mid,movies.name,theaters.tid,theaters.location, to_char(when_show,'dd-Mon-yyyy') as when" +
        " from playat,movies,theaters where playat.mid=movies.mid and playat.tid=theaters.tid order by tid"
    )
    .then((results) => {
      let records = results.rows;
      records.push(results);
      let uid = req.user.uid;

      records.push(uid);

      res.render("location", { records });
    })
    .catch((err) => {
      console.log("err", err);
      res.redirect("/");
    });
});
//delete the list, only available to vender
//to recognize a vender, we use uid
//currently use vender@vender.com whose uid = 10
app.get("/login/delete/:mid/:tid", (req, res) => {
  client
    .query("delete from playat where mid=$1 and tid= $2", [
      req.params.mid,
      req.params.tid,
    ])
    .then(() => {
      res.redirect("/location");
    })
    .catch((err) => {
      console.log("err", err);
      res.redirect("/");
    });
});
//only allow vender to update the list
//insert new showtime
app.post("/insert-location", (req, res) => {
  client
    .query("insert into playat (mid,tid,when_show) values ($1,$2,$3)", [
      req.body.mid,
      req.body.tid,
      req.body.when,
    ])
    .then(() => {
      res.redirect("/location");
    })
    .catch((err) => {
      console.log("err", err);
      res.redirect("/");
    });
});
//redirect to search page where has the original movie list
app.get("/search-byca", (req, res) => {
  res.redirect("/search");
});
app.get("/search-bydate", (req, res) => {
  res.redirect("/search");
});
app.get("/search-byname", (req, res) => {
  res.redirect("/search");
});

//display the playlist with movie & diector information
//user must login first in order to see this page
app.get("/insert", checkAuthenticated, (req, res) => {
  let uid = req.user.uid;
  client
    .query(
      "select playlist.uid,playlist.mid,movies.name,to_char(release_date,'dd-Mon-yyyy') as release_date ,directors.name as dn,category from" +
        " movies,playlist,directors where playlist.mid=movies.mid and directors.did=movies.director and playlist.uid=$1",
      [uid]
    )
    .then((results) => {
      let records = results.rows;
      records.push(results);
      res.render("insert", { records });
    })

    .catch((err) => {
      console.log("err", err);
      res.redirect("/");
    });
});
//insert into the playlist
app.post("/insert-watch", (req, res) => {
  let uid = req.user.uid;
  client
    .query("insert into playlist (uid,mid) values($1,$2)", [uid, req.body.mid])
    .then(() => {
      //console.log('resulut?',result)
      res.redirect("/insert");
    })
    .catch((err) => {
      console.log("err", err);
      res.redirect("/");
    });
});
//delete items in the playlist
app.get("/insert/delete-watch/:mid/:uid", (req, res) => {
  client
    .query("delete from playlist where uid=$1 and mid= $2", [
      req.params.uid,
      req.params.mid,
    ])
    .then(() => {
      res.redirect("/insert");
    })
    .catch((err) => {
      console.log("err", err);
      res.redirect("/");
    });
});

function checkAuthenticated(req, res, next) {
  if (req.isAuthenticated()) {
    return next();
  }

  res.redirect("/login");
}

/*
 * Function to connect to client
 */
async function connectToClient() {
  try {
    //attempt to connect to client
    await client.connect();
  } catch (e) {
    //catch and log errors
    console.error("could not connect..", e);
  } finally {
    //log successful completion of try block
    console.log("successfully connected to client..");
  }
}

/*
 * Function to disconnect from client
 */
async function disconnectFromClient() {
  try {
    await client.end();
  } catch (e) {
    console.error("could not disconnect..", e);
  } finally {
    console.log("successfully disconnected from client..");
  }
}
