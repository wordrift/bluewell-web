
var db = require('../../../db.js');
var user = require('../../../user.js');
var global_inc = require('../../../global_inc.js');

exports.addRoutes = function(app,prefix)
{
    app.get(prefix + '/migrate', user.checkAdmin, migrate);
    app.get(prefix + '/fixup_story_text/:story_id', user.checkAdmin, fixup_story_text);
};

function migrate(req,res)
{
    res.write("<pre>");
    
    res.write("probably don't want to do this.  Enable it in code if you do.");
    res.end();
    return;

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

function fixup_story_text(req,res)
{
    var story_id = req.params.story_id;
    
    res.write("<pre>");
    res.write("story_id: " + story_id + "\n");

    var sql = "SELECT * FROM story ";
    sql += " WHERE story_id = ?";
    res.write("sql: " + sql + "\n");

    db.queryFromPool(sql,[story_id],function(err,results)
    {
        if( err )
        {
            res.write(JSON.stringify(err,null,"\t"));
            res.end();
        }
        else
        {
            if( results.length > 0 )
            {
                var story = results[0];
                var text = story.text;
                var new_text = cleanHTML(text);
                
                var updates = {
                    text: new_text,
                };
                
                var sql = "UPDATE story SET ? WHERE story_id = ?";
                db.queryFromPool(sql,[updates,story_id],function(err,results)
                {
                    if( err )
                    {
                        res.write("Err in update\n");
                        res.write(JSON.stringify(err,null,"\t"));
                        res.end();
                    }
                    else
                    {
                        res.write("success: \n");
                        res.write(JSON.stringify(results,null,"\t"));
                        res.end();
                    }
                });
            }
            else
            {
                res.write("story not found\n");
                res.end();
            }
        }
    });
}
