

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
    var fb_id = profile.id;
    var email = profile.emails[0].value;

    var props = {
        email: email,
        display_name: profile.displayName,
        fb_id: fb_id,
        fb_access_token: accessToken,
        fb_json: profile._raw
    };

    var sql = "SELECT user_id,is_active FROM user WHERE fb_id = ?";
    genericCreateOrUpdate(sql,fb_id,email,props,done);
}

function genericCreateOrUpdate(find_sql,find_id,email,props,done)
{
    db.queryFromPool(find_sql,find_id,function(err,results)
    {
        if( err )
        {
            console.log(err);
            done({ user_error: "db" });
        }
        else
        {
            if( results.length > 0 )
            {
                var user = results[0];
                updateUser(user,props,done);
            }
            else
            {
                var sql = "SELECT user_id,is_active FROM user WHERE email = ?";
                db.queryFromPool(sql,email,function(err,results)
                {
                    if( err )
                    {
                        done({ user_error: "db" });
                    }
                    else
                    {
                        if( results.length > 0 )
                        {
                            var user = results[0];
                            updateUser(user,props,done);
                        }
                        else
                        {
                            createUser(props,done);
                        }
                    }
                });
            }
        }
    });
};

function updateUser(user,props,done)
{
    var user_id = user.user_id;
    var is_active = user.is_active;

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
function createUser(props,done)
{
    var sql = "INSERT INTO user SET ?";
    db.queryFromPool(sql,props,function(err,result)
    {
        if( err )
        {
            console.log("user insert failed:");
            console.log(err);
            done({ user_error: "db" });
        }
        else
        {
            done({ user_error: "not_active" });
        }
    });
}

exports.googleCreateOrUpdate = function(accessToken,profile,done)
{
    var google_id = profile.id;
    var email = profile.emails[0].value;

    var props = {
        email: email,
        display_name: profile.displayName,
        google_id: google_id,
        google_access_token: accessToken,
        google_json: profile._raw
    };

    var sql = "SELECT user_id,is_active FROM user WHERE google_id = ?";
    genericCreateOrUpdate(sql,google_id,email,props,done);
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
exports.checkAdmin = function(req,res,next)
{
    return validCheck(req,res,next,
        function(err)
        {
            if( user.is_admin )
            {
                return next(err);
            }
            else
            {
                res.redirect('/');
            }
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
            var sql = "\
SELECT user.user_id,user.email,user.display_name,user.is_admin \
FROM user_session \
JOIN user ON user.user_id = user_session.user_id \
WHERE session_key = ? AND user.is_active = 1 \
";
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
                        var user = results[0].user;
                        g_session_map[session_key] = user;
                        req.user = user;
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
