
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

passport.use(new FacebookStrategy(
    {
        clientID: config.fb.app_id,
        clientSecret: config.fb.app_secret,
        callbackURL: config.fb.callback_url
    },
    function(accessToken, refreshToken, profile, done)
    {
        user.facebookCreateOrUpdate(accessToken,profile,done);
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

app.get('/debug',debug_handler);

var scope = [
    'email',
    'user_birthday',
    'user_status',
    'user_hometown',
    'user_location',
    'user_likes'
];
app.get('/auth/facebook',passport.authenticate('facebook',{ session: false, scope: scope }));

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




function debug_handler(req,res)
{
    var sql = "INSERT INTO stream_node (story_id, user_id, story_order) VALUES ?";
    
    var values = [
        [ 1946, 8, 1000 ],
        [ 2063, 8, 2000 ],
        [ 1900, 8, 3000 ],
        [ 1696, 8, 4000 ],
        [ 1596, 8, 5000 ],
        [ 1575, 8, 6000 ],
        [ 1809, 8, 7000 ],
        [ 2055, 8, 8000 ],
        [ 1813, 8, 9000 ],
        [ 1870, 8, 10000 ]
    ];
    db.queryFromPool(sql,[values],function(err,results)
    {
        if( err )
        {
            console.log(err);
            res.send(err);
        }
        else
        {
            console.log(results);
            res.send(results);
        }
    });
}







