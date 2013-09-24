
var api_story = require('./story');
var user = require('../../user.js');

exports.addRoutes = function(app,prefix)
{
    app.get(prefix + '/story/:story_id',user.checkSessionForApi,api_story.getStory);

};

