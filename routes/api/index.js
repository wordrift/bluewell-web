
var api_story = require('./story');

exports.addRoutes = function(app,prefix)
{
    app.get(prefix + '/story/:story_id',api_story.get_story);

};

