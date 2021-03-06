/**
 * Created by minkwon on 4/04/2016.
 */
var camera = [
    0,0,0,                    // x,y,z coordinates
    0,0,1,                   // viewing direction
    65                        // field of view : example 45
];

var lights = [
    2,                         // number of lights
    0,200,200, 1,1,1,       // light 1, x,y,z location, and rgb colour (green)
    0,100,100, 1,1,1        // light 2, x,y,z location, and rgb colour (white)
];

var objects = [
    7,                                                                             //number of objects
    ObjTyp.SPHERE,      13, 0,0.5,0.5, 0.9,0.7,0.3,1.0, -60,0,200,50,           // typ,recsz,r,g,b,spec,lamb,amb,opac, x,y,z,rad,
    ObjTyp.SPHERE,      13, 0.5,0.5,0.1, 0.9,0.7,0.3,1.0, 60,100,200,50,           // typ,recsz,r,g,b,spec,lamb,amb,opac, x,y,z,rad,
    ObjTyp.SPHERE,      13, 0.5,1.0,0.5, 0.9,0.7,0.3,1.0, 0, 40,200,5,
    ObjTyp.SPHERE,      13, 0.5,1.0,0.5, 0.9,0.7,0.3,1.0, 0, 0,200,10,
    ObjTyp.SPHERE,      13, 0.5,1.0,0.5, 0.9,0.7,0.3,1.0, -10, 0,180,10,
    ObjTyp.SPHERE,      13, 0.5,1.0,0.5, 0.9,0.7,0.3,1.0, -20, 0,160,10,
    ObjTyp.SPHERE,      13, 0.5,1.0,0.5, 0.9,0.7,0.3,1.0, -30, 0,140,10
];
