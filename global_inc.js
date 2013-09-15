
global.mergeObjects = function(obj1,obj2)
{
    var obj3 = {};
    
    for( var a in obj1 )
    {
        obj3[a] = obj1[a];
    }
    for( var a in obj2 )
    {
        obj3[a] = obj2[a];
    }
    return obj3;
}
