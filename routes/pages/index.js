
var db = require('../../db.js');

exports.addRoutes = function(app,prefix)
{
    app.get(prefix + '/', index);
    app.get(prefix + '/reader', reader);
};

function index(req, res)
{
    res.redirect('/reader');
}
function reader(req,res)
{
    var story_id = req.param('story_id');
    var params = { story_id: story_id };
    res.render('reader',params);
}
