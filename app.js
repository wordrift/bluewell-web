
var global_inc = require('./global_inc');

var async = require('async');
var express = require('express');
var api = require('./routes/api');
var pages = require('./routes/pages');
var http = require('http');
var path = require('path');
var config = require('./config.json')
var db = require('./db.js');
var escape_html = require('escape-html');
var passport = require('passport');
var FacebookStrategy = require('passport-facebook').Strategy;
var GoogleStrategy = require('passport-google-oauth').OAuth2Strategy;
var user = require('./user.js');

passport.use(new FacebookStrategy(
    {
        clientID: config.fb.app_id,
        clientSecret: config.fb.app_secret,
        callbackURL: config.fb.callback_url
    },
    function(accessToken,refreshToken,profile,done)
    {
        user.facebookCreateOrUpdate(accessToken,profile,done);
    }
));
passport.use(new GoogleStrategy(
    {
        clientID: config.google.app_id,
        clientSecret: config.google.app_secret,
        callbackURL: config.google.callback_url
    },
    function(accessToken,refreshToken,profile,done)
    {
        console.log("accessToken:");
        console.log(accessToken);
        console.log("profile:");
        console.log(profile);
        user.googleCreateOrUpdate(accessToken,profile,done);
    }
));


var app = express();

app.enable('trust proxy')
app.engine('.html', require('ejs').__express);

app.set('port', process.env.PORT || 3002);
app.set('views', __dirname + '/views');
app.set('view engine', 'html');

//app.use(express.favicon());
app.use(express.logger('dev'));
app.use(express.bodyParser());
app.use(express.methodOverride());
app.use(express.cookieParser());
//app.use(express.session({ secret: 'sessionsecret' }));
app.use(passport.initialize());
//app.use(passport.session());
app.use(app.router);
app.use(require('less-middleware')({ src: __dirname + '/static' }));
app.use(express.static(path.join(__dirname, 'static')));
app.use(user.errorHandler);

if( app.get('env') == 'development' )
{
    app.use(express.errorHandler());
}

api.addRoutes(app,'/api/1');
pages.addRoutes(app,'');

var fb_scope = [
    'email',
    'user_birthday',
    'user_status',
    'user_hometown',
    'user_location',
    'user_likes'
];
app.get('/auth/facebook',passport.authenticate('facebook',{ session: false, scope: fb_scope }));
app.get('/auth/facebook/callback',function(req, res, next)
{
    passport.authenticate('facebook',{ session: false }, function(err, user, info)
    {
        if( err )
        {
            res.redirect('/fail');
        }
        else
        {
            res.cookie('session_key',user.session_key,{ maxAge: 10*365*24*60*60*1000, httpOnly: true });
            res.redirect('/home');
        }
    })(req, res, next);
});

var google_scope = [
    'https://www.googleapis.com/auth/userinfo.profile',
    'https://www.googleapis.com/auth/userinfo.email'
];
app.get('/auth/google',passport.authenticate('google',{ session: false, scope: google_scope }));
app.get('/auth/google/callback',function(req, res, next)
{
    passport.authenticate('google',{ session: false }, function(err, user, info)
    {
        if( err )
        {
            res.redirect('/fail');
        }
        else
        {
            res.cookie('session_key',user.session_key,{ maxAge: 10*365*24*60*60*1000, httpOnly: true });
            res.redirect('/home');
        }
    })(req, res, next);
});

app.get('/logout',function(req,res)
{
    res.clearCookie('session_key');
    res.redirect('/');
});


http.createServer(app).listen(app.get('port'), function()
{
    console.log('Express server listening on port ' + app.get('port'));
});












