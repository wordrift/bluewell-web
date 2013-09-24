
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
var user = require('./user.js');

passport.serializeUser(function(user, done)
{
    done(null, user);
});

passport.deserializeUser(function(obj, done)
{
    done(null, obj);
});


passport.use(new FacebookStrategy(
    {
        clientID: config.fb.app_id,
        clientSecret: config.fb.app_secret,
        callbackURL: config.fb.callback_url
    },
    function(accessToken, refreshToken, profile, done)
    {
        console.log('accessToken:' + accessToken);
        console.log('refreshToken:' + refreshToken);
        console.log('profile:' + JSON.stringify(profile,null,"  "));
        
        user.facebookCreateOrUpdate(accessToken,profile,done);

        process.nextTick(function ()
        {
          // To keep the example simple, the user's Facebook profile is returned to
          // represent the logged-in user.  In a typical application, you would want
          // to associate the Facebook account with a user record in your database,
          // and return that user instead.
          //return done(null, profile);
        });
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
app.use(express.cookieParser('cookiesecret'));
app.use(express.session({ secret: 'sessionsecret' }));
app.use(passport.initialize());
app.use(passport.session());
app.use(app.router);
app.use(require('less-middleware')({ src: __dirname + '/static' }));
app.use(express.static(path.join(__dirname, 'static')));

if( app.get('env') == 'development' )
{
    app.use(express.errorHandler());
}

api.addRoutes(app,'/api/1');
pages.addRoutes(app,'');

app.get('/home', function(req, res)
{
    res.send("<pre>\nuser: " + JSON.stringify(req.user,null,'  '));
});


//app.get('/migrate',migrate);

var scope = [
    'email',
    'user_birthday',
    'user_status',
    'user_hometown',
    'user_location',
    'user_likes'
];
app.get('/auth/facebook',passport.authenticate('facebook',{ scope: scope }),function(req, res)
{
    console.log("/auth/facebook");
    // The request will be redirected to Facebook for authentication, so this
    // function will not be called.
});

// GET /auth/facebook/callback
//   Use passport.authenticate() as route middleware to authenticate the
//   request.  If authentication fails, the user will be redirected back to the
//   login page.  Otherwise, the primary route function function will be called,
//   which, in this example, will redirect the user to the home page.
app.get('/auth/facebook/callback', passport.authenticate('facebook', { failureRedirect: '/' }), function(req, res)
{
    console.log("/auth/facebook/callback");
    res.redirect('/home');
});

http.createServer(app).listen(app.get('port'), function()
{
    console.log('Express server listening on port ' + app.get('port'));
});

function ensureAuthenticated(req, res, next)
{
    console.log("ensureAuthenticated");
    if( req.isAuthenticated() )
    {
        return next();
    }
    res.redirect('/')
}


function migrate(req,res)
{
    res.write("<pre>");

    var sql = "SELECT * FROM old_reader.story ";
    sql += " NATURAL JOIN old_reader.story_creator";
    //sql += " LIMIT 5";
    
    res.write("sql: " + sql + "\n");
    
    db.queryFromPool(sql,[],function(err,results)
    {
        if( err )
        {
            res.send(JSON.stringify(err,null,"\t"));
        }
        else
        {
            async.times(results.length, function(i, next)
            {
                var old_story = results[i];
                
                res.write("story: " + i + ", title: " + old_story.title + "\n");

                migrateStory(res,old_story,next);
            },
            function(err, users)
            {
                //res.write(JSON.stringify(g_tags,null,"\t"));
                res.write("\n");
                res.write("done done\n\n");
                res.end();
            });
        }
    });
}


function clean_int(val)
{
    if( !val )
        return 0;
    return val;
}

function migrateStory(res,old_story,next)
{
    var pub = old_story['firstPub.publication'];
    if( old_story['firstPub.section'] )
    {
        pub += ", Section: " + old_story['firstPub.section'];
    }
    if( old_story['firstPub.volume'] )
    {
        pub += ", Volume: " + old_story['firstPub.volume'];
    }
    if( old_story['firstPub.issue'] )
    {
        pub += ", Issue: " + old_story['firstPub.issue'];
    }
    
    var props = {
        category: old_story.category,
        genre: old_story.genre,
        language: old_story.language,
        title: old_story.title,
        subtitle: old_story.subtitle,
        text: cleanHTML(old_story.text),
        author_notes: cleanHTML(old_story.creatorInfo),
        word_count: old_story.wordCount,
        source_publish_date: old_story['firstPub.date'],
        source_url: old_story['firstPub.url'],
        source_publication: pub,
        source_tweets: clean_int(old_story['firstPub.twitter']),
        source_fb_likes: clean_int(old_story['firstPub.facebook']),
        source_views: clean_int(old_story['firstPub.pageViews']),
    };

    //res.write(escape_html(JSON.stringify(props,null,'\t')));
    //res.write("\n");
    
    var sql = "INSERT INTO story SET ?";
    db.queryFromPoolWithConnection(sql,props,function(err,result,connection)
    {
        if( err )
        {
            console.log("story insert failed:");
            console.log(err);
            connection.release();
            next();
        }
        else
        {
            var story_id = result.insertId;
            var props2 = {
                story_id: story_id,
                author: old_story.creator,
            };
            var sql = "INSERT INTO story_author SET ?";
            connection.query(sql,props2,function(err,result)
            {
                if( err )
                {
                    console.log("author insert failed:");
                    console.log(err);
                }
                else
                {
                    console.log("success");
                }
                connection.release();
                next();
            });
        }
    });
}






