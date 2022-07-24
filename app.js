// to create a server
import express from "express";

// to obtain data posted on the server
import bodyParser from "body-parser";

//import https from "https";

// for getting value in certain pattern
import _ from "lodash";

// API for fetching news articles
import NewsAPI from "newsapi";

// for using ejs feature for data transmission
import ejs from "ejs";

// for local mongoDB connection and for performing CRUD operation
import mongoose from "mongoose";

// to utilize data stored in .env file
import { } from "dotenv/config";

// used for authentication and setting up cookies
import passport from "passport";

// creating the session for user and saving it
import session from "express-session";

// for using passport functionality with mongoose commands
import passportLocalMongoose from "passport-local-mongoose";

// to get the current path
import { fileURLToPath } from "url";

// for getting the root direcctory path
import { dirname } from "path";

// to create a alert inside a ejs folder
import notifier from "node-notifier";

import { Strategy as GoogleStrategy } from "passport-google-oauth20";

import findOrCreate from "mongoose-findorcreate";

import { Strategy as FacebookStrategy } from "passport-facebook";

import { Strategy as TwitterStrategy } from "passport-twitter";

const app = express();

// checking the state of current user wether he/she is logged in or not and accordingly change the login/logout button
let logged = false;

// accessing the News API Key
const apiKey = process.env.NEWSAPI_KEY;

const newsapi = new NewsAPI(apiKey);

// setting view engine so as to make .ejs file compatible to run
app.set("view engine", "ejs");

// current file directory
const __filename = fileURLToPath(import.meta.url)

// root directory
const __dirname = dirname(__filename)

// use so to load static pages on the server
app.use(express.static(__dirname + "/public"))

// to collect the information passed by the user on the website
app.use(bodyParser.urlencoded({ extended: true }));

// creating a session which would be stored as cookie for user cerdentials retensation
app.use(session({
    // this is the secret we have created and using this wants to save the session
    secret: process.env.SECRET,
    resave: false,
    saveUninitialized: false
}))

// for initializing the passport package
app.use(passport.initialize())

// initiating the session through passport
app.use(passport.session())

// mongoose connection establishment
mongoose.connect("mongodb+srv://Sachin89:Sachin89@palnews.gchwg.mongodb.net/newsDB");

// Creating Schema for favourties 
const newsSchema = new mongoose.Schema({
    name: String,
    title: String,
    description: String,
    url: String,
    urlToImage: String
});

// Collection(Model) for newsSchema 
const Fav = mongoose.model("Fav", newsSchema)

// For saving it for a specfic user
const userSchema = new mongoose.Schema({
    username: String,
    password: String,
    googleId: String,
    facebookId: String,
    twitterId: String,
    favourites: [newsSchema]
})



// pulgin so that we can use passport through mongoose on userSchema
userSchema.plugin(passportLocalMongoose)
userSchema.plugin(findOrCreate)

//Creating a Collection to store the favourite
const News = mongoose.model("New", userSchema);

// Creating a local strategy on News model to authenticate user
passport.use(News.createStrategy())

// This enable us to serialize that is make a cookie for current user with given properties
passport.serializeUser(function (user, done) {
    done(null, user.id);
});

// This enable us to deserialize i.e. to use the store cookie for user verification
passport.deserializeUser(function (id, done) {
    News.findById(id, function (err, user) {
        done(err, user);
    });
});

passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: "https://calm-mesa-84299.herokuapp.com/auth/google/home",
    userProfileURL: "https://www.googleapis.com/oauth2/v3/userinfo"
},
    function (accessToken, refreshToken, profile, cb) {

        const newUser = {
            googleId: profile.id,
            favourites: []
        }

        News.findOrCreate({ username: profile.emails[0].value }, newUser, function (err, user) {
            return cb(err, user);
        });
    }
));

passport.use(new FacebookStrategy({
    clientID: process.env.FACEBOOK_APP_ID,
    clientSecret: process.env.FACEBOOK_APP_SECRET,
    callbackURL: "https://calm-mesa-84299.herokuapp.com/auth/facebook/home",
    profileFields: ['id', 'displayName', 'photos', 'email']
},
    function (accessToken, refreshToken, profile, cb) {

        const newUser = {
            facebookId: profile.id,
            favourites: []
        }

        News.findOrCreate({ username: profile.emails[0].value }, newUser, function (err, user) {
            return cb(err, user);
        });
    }
));

// for authentication through twitter also we need to include the token key and secret along with that of the consumer key and secret
passport.use(
    new TwitterStrategy(
        {
            consumerKey: process.env.TWITTER_CONSUMER_KEY,
            consumerSecret: process.env.TWITTER_CONSUMER_SECRET,
            oauth_token_key: process.env.TWITTER_ACCESS_TOKEN,
            oauth_token_secret: process.env.TWITTER_ACCESS_TOKEN_SECRET,
            callbackURL: "https://calm-mesa-84299.herokuapp.com/auth/twitter/home",
            includeEmail: true
        },
        function (accessToken, refreshToken, profile, done) {

            const newUser = {
                twitterId: profile.id,
                favourites: []
            }

            News.findOrCreate({ username: profile.emails[0].value }, newUser, function (err, user) {
                return done(err, user);
            });
        }
    )
);

let news = [];

// options for getting a certain type of news
let options = {
    language: 'en',
    country: 'in',
    category: 'general',
    pageSize: 51
}

// get request on home page of the app
app.get("/", (req, res, next) => {

    // check if user is authenticated then changes its status
    if (req.isAuthenticated()) {
        logged = true
    }
    res.render("home", { loggedIn: logged, homePage: true})
})

// to get news from specific category 
app.get("/category/:categoryId", (req, res) => {

    let value = _.lowerCase(req.params.categoryId);
    options.category = value;

    // Object to keep the highlight bar to current category
    const barActive = {
        general: {
            name: "general",
            class: "deactive"
        },
        business: {
            name: "business",
            class: "deactive"
        },
        entertainment: {
            name: "entertainment",
            class: "deactive"
        },
        health: {
            name: "health",
            class: "deactive"
        },
        science: {
            name: "science",
            class: "deactive"
        },
        sports: {
            name: "sports",
            class: "deactive"
        },
        technology: {
            name: "technology",
            class: "deactive"
        }
    }

    // If category is current requested then set it to active other wise deactive
    for (const ele in barActive) {
        if (barActive[ele].name === value) {
            barActive[ele].class = "active"
        } else {
            barActive[ele].class = "deactive"
        }
    }

    // check if user is authenticated then changes its status
    if (req.isAuthenticated()) {
        logged = true
    }
    newsapi.v2.topHeadlines(options).then(response => {

        news = response.articles;
        res.render("news", { newsItem: response.articles, loggedIn: logged, barStatus: barActive, homePage: false}, (err, html) => {
            if (err) {
                console.log(err);

                // if error occur with an include ejs file in the rendered file then try on next one
                next(err)
                return
            }
            res.send(html)
        });
    });

    // res.redirect("/");
})

// to get news articles for specific topics
app.post("/search", (req, res) => {

    let searchValue = _.lowerCase(req.body.searchNews);
    let searchObject = {
        q: searchValue,
        language: 'en',
        pageSize: 50
    }

    newsapi.v2.everything(searchObject).then(response => {

        news = response.articles;
        if (req.isAuthenticated()) {
            res.render("search", { newsItem: response.articles, loggedIn: true, homePage: false});
        } else {
            res.render("search", { newsItem: response.articles, loggedIn: false, homePage: false});
        }
    });
})

// to get the signup page
app.get("/signup", (req, res) => {
    res.render("signup")
})

// to store the user info and sending them to login page 
app.post("/signup", (req, res) => {

    const newUser = new News({
        username: req.body.username,
        favourite: req.body.favourite
    })

    // registering the user by taking neccessary info and also storing it in mongoDB through passportLocalMongoose function register()
    News.register(newUser, req.body.password, (err, user) => {
        if (err) {
            // if error occur so send them to same page again
            console.log(err);
            res.redirect("/signup")
        } else {
            // if successfull authenticate them with local strategy and redirect to login page
            passport.authenticate("local")(req, res, () => {
                res.redirect("/login")
            })
        }
    })
})

// to bring the user on login page
app.get("/login", (req, res) => {
    // if authenticated render login page
    if (req.isAuthenticated()) {
        res.render("login", { warningMsg: false })
    } else {
        res.render("login", { warningMsg: false })
    }
})

app.post("/login",
    passport.authenticate("local", { failureRedirect: "/login", failureMessage: true }),
    function (req, res) {
        res.redirect("/");
    });


app.get("/auth/google",
    passport.authenticate("google", { scope: ["profile", "email"] }));

app.get("/auth/google/home",
    passport.authenticate("google", { failureRedirect: "/login" }),
    function (req, res) {
        // Successful authentication, redirect home.
        res.redirect("/");
    });

app.get("/auth/facebook",
    passport.authenticate("facebook", { scope: ["public_profile", "email"] }));

app.get("/auth/facebook/home",
    passport.authenticate("facebook", { failureRedirect: "/login" }),
    function (req, res) {
        // Successful authentication, redirect home.
        res.redirect("/");
    });

app.get("/auth/twitter",
    passport.authenticate("twitter", { scope: ["profile", "email"] }));

app.get("/auth/twitter/home",
    passport.authenticate("twitter", {
        failureRedirect: "/login"
    }),
    function (req, res) {
        // Successful authentication, redirect home.
        res.redirect('/');
    });

/* // to verify the user and sending it to home page
app.post("/login", (req, res) => {

    console.log(req.user);
    const newUser = new News({
        username: req.body.username,
        password: req.body.password
    })
    // to login the user 
    req.login(newUser, (err) => {
        if (err) {
            // if user not found in database then send back to login page
            console.log(err);
            res.render("login", { warningMsg: true })
        } else {
            // found then send to home page
            res.redirect("/")
        }
    })
}) */

// To show the news which are marked as favourites
app.get("/favourites", (req, res) => {

    // if authenticated then show their faveourites news article
    if (req.isAuthenticated()) {
        logged = true
        News.findById(req.user.id, (err, news) => {
            if (err) {
                console.log(err);
            } else {
                // passes all the news that were stored in the favourites
                res.render("favourites", { newsItem: news.favourites, loggedIn: logged, homePage: false});
            }
        })

    } else {
        // if not authenticated then one must login first
        res.render("loginFirst", {loggedIn: false, homePage: false})
    }


});

// To Save the news to the favourite list
app.post("/favourites", (req, res) => {

    if (req.isAuthenticated()) {
        // news element as a string
        const element = req.body.favouriteNews;

        // converting this into a JSON object
        const newsEle = JSON.parse(element);

        // storing the neccessary data of the articles in the document following the newsSchema
        const newsElement = new Fav({
            name: newsEle.source.name,
            title: newsEle.title,
            description: newsEle.description,
            url: newsEle.url,
            urlToImage: newsEle.urlToImage
        });

        // To create an ObjectId for the given id of user to search in the database
        const userId = mongoose.Types.ObjectId(req.user.id);

        // to save this document in the News model
        News.updateOne({ _id: userId }, { $addToSet: { favourites: newsElement } }, (err) => {
            if (err) {
                console.log(err);
            } else {
                notifier.notify("Added to favourites")
                // this will make sure that your position after adding favourite remain the same rather then going back to the top of the page
                res.status(204).send()
            }
        })
    } else {
        // if not authenticated then one must login first
        res.render("loginFirst", { loggedIn: false, homePage: false})
    }
});

// To delete the news from the favourites list
app.post("/delete", (req, res) => {

    // to get the string value of the object of element
    const element = req.body.deleteNews;

    // converting it into JSON fromat
    const deleteNews = JSON.parse(element);

    console.log(deleteNews);

    // converting _id obtain into the ObjectID
    const delNewsId = mongoose.Types.ObjectId(deleteNews._id);

    // To create an ObjectId for the given id of user to search in the database
    const userId = mongoose.Types.ObjectId(req.user.id);

    // Deleting the document with the given id
    News.findOneAndUpdate({ _id: userId }, { $pull: { favourites: { _id: delNewsId } } }, (err) => {
        if (err) {
            console.log(err);
        } else {
            // Once done redirect to favourite list
            res.redirect("/favourites");
        }
    })
});

// to logout from the app
app.get("/logout", (req, res) => {

    req.logout((err) => {
        if (err) {
            console.log(err);
        } else {
            // setting status as one is unauthorized
            logged = false
            // setting the news types to default
            options = {
                language: 'en',
                country: 'in',
                category: 'general',
                pageSize: 50
            }
            res.redirect("/")
        }
    })
})
// use to show use on website but seen we can get limited content thus we are not using this now
/* app.get("/post/:postId", (req, res) => {

    let newsTitle = _.lowerCase(req.params.postId);
    news.forEach( (ele) => {
        
        let eleTitle = _.lowerCase(ele.title);
        if (eleTitle === newsTitle) {

            res.render("post", { news: ele });
        }
    });
})
*/

app.listen(process.env.PORT || 3000, (err) => {

    if(err){
        console.log(err);
    } else {
        console.log("Server Started");
    }
})