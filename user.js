

var db = require('./db.js');
var crypto = require('crypto');

var g_session_map = {};

exports.errorHandler = function(err,req,res,next)
{
    if( err.user_error )
    {
        if( err.user_error == 'not_active' )
        {
            res.redirect('/waitlist');
        }
        else
        {
            res.redirect('/fail');
        }
    }
    else
    {
        next(err);
    }
};

exports.facebookCreateOrUpdate = function(accessToken,profile,done)
{
    var props = {
        email: profile.emails[0].value,
        display_name: profile.displayName,
        fb_id: profile.id,
        fb_access_token: accessToken,
        fb_json: profile._raw
    };

    var sql = "SELECT user_id,is_active FROM user WHERE fb_id = ?";
    db.queryFromPool(sql,props.fb_id,function(err,results)
    {
        if( err )
        {
            console.log("user find failed:");
            console.log(err);
            done({ user_error: "db" });
        }
        else
        {
            if( results.length > 0 )
            {
                var user_id = results[0].user_id;
                var is_active = results[0].is_active;
            
                var sql = "UPDATE user SET ? WHERE user_id = ?";
                db.queryFromPool(sql,[props,user_id],function(err,result)
                {
                    if( err )
                    {
                        console.log("user update failed:");
                        console.log(err);
                        done({ user_error: "db" });
                    }
                    else
                    {
                        if( is_active )
                        {
                            createUserSession(user_id,done);
                        }
                        else
                        {
                            console.log("Not active user, updated user information, denying login");
                            done({ user_error: "not_active" });
                        }
                    }
                });
            }
            else
            {
                var sql = "INSERT INTO user SET ?";
                db.queryFromPool(sql,[props,user_id],function(err,result)
                {
                    if( err )
                    {
                        console.log("user insert failed:");
                        console.log(err);
                        done({ user_error: "db" });
                    }
                    else
                    {
                        console.log("Created new user, assuming default in-active");
                        done({ user_error: "not_active" });
                    }
                });
            }
        }
    });
};

function createUserSession(user_id,done)
{
    crypto.randomBytes(16,function(err, buf)
    {
        if( err )
        {
            console.log("no random?!");
            done({ user_error: "random" });
        }
        else
        {
            var session_key = buf.toString('hex');
            console.log("session key: " + session_key);
            var props = {
                user_id: user_id,
                session_key: session_key
            };
            var sql = "INSERT INTO user_session SET ?";
            db.queryFromPool(sql,props,function(err,result)
            {
                if( err )
                {
                    console.log("session key create failed:");
                    console.log(err);
                    done({ user_error: "db" });
                }
                else
                {
                    done(null,props);
                }
            });
        }
    });
}

exports.checkSessionForPage = function(req,res,next)
{
    return validCheck(req,res,next,
        function(err)
        {
            return next(err);
        },
        function() { res.redirect('/'); }
    );
}
exports.checkSessionForApi = function(req,res,next)
{
    return validCheck(req,res,next,
        function(err) { res.send(500); },
        function() { res.send(403); }
    );
}

function validCheck(req,res,next,error,failure)
{
    exports.isValidSession(req,function(err,is_valid)
    {
        if( err )
        {
            error(err);
        }
        else
        {
            if( is_valid )
            {
                next();
            }
            else
            {
                res.clearCookie('session_key');
                failure();
            }
        }
    });
}

exports.isValidSession = function(req,done)
{
    var session_key = false;
    if( req.cookies.session_key )
    {
        session_key = req.cookies.session_key;
    }
    else
    {
        session_key = req.param('session_key');
    }
    if( session_key && session_key.length > 0 )
    {
        if( session_key in g_session_map )
        {
            req.user = g_session_map[session_key];
            done(false,true);
        }
        else
        {
            var sql = "SELECT user.user_id,user.email,user.display_name FROM user_session ";
            sql += " NATUAL JOIN user "
            sql += " WHERE session_key = ? ";
            var options = {
                sql: sql,
                nestTables: true,
            };
            db.queryFromPool(options,session_key,function(err,results)
            {
                if( err )
                {
                    done(err);
                }
                else
                {
                    if( results.length > 0 )
                    {
                        console.log("found user");
                        g_session_map[session_key] = results[0].user;
                        req.user = results[0].user;
                        done(false,true);
                    }
                    else
                    {
                        console.log("no found user");
                        done(false,false);
                    }
                }
            });
        }
    }
    else
    {
        done(false,false);
    }
}
