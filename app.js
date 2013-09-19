
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
//app.use(express.cookieParser('your secret here'));
//app.use(express.session());

app.use(app.router);
app.use(require('less-middleware')({ src: __dirname + '/static' }));
app.use(express.static(path.join(__dirname, 'static')));

if( app.get('env') == 'development' )
{
    app.use(express.errorHandler());
}

api.addRoutes(app,'/api/1');
pages.addRoutes(app,'');

//app.get('/migrate',migrate);

http.createServer(app).listen(app.get('port'), function(){
    console.log('Express server listening on port ' + app.get('port'));
});

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






