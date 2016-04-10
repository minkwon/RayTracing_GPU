/**
 * Created by minkwon on 4/04/2016.
 */


function Enum(constantsList) {
    for (var i in constantsList) {
        this[constantsList[i]] = i;
    }
}

var ObjTyp = new Enum(['EMPTY', 'SPHERE', 'CUBOID', 'CYLINDER', 'CONE', 'TRIANGLE']);

var fps = { startTime : 0, frameNumber : 0,
    getFPS : function() {
        this.frameNumber++;
        var d = new Date().getTime(), currentTime = ( d - this.startTime ) / 1000, result = Math.floor( ( this.frameNumber / currentTime ) );
        if( currentTime > 1 ) {
            this.startTime = new Date().getTime();
            this.frameNumber = 0;
        }
        return result;
    }
};

// function that calculates vectors, field of view and pixel size with given Camera
function getPerspectiveInfo(Camera) {
    var viewPoint = new THREE.Vector3(Camera[0], Camera[1], Camera[2]),
        direction = new THREE.Vector3(Camera[3], Camera[4], Camera[5]),
        fov = Camera[6],
        eyeUnitVect = new THREE.Vector3().subVectors(direction, viewPoint).normalize(),
        rightVect = new THREE.Vector3().crossVectors(eyeUnitVect, new THREE.Vector3(0, 1, 0)),
        upVect = new THREE.Vector3().crossVectors(rightVect, eyeUnitVect),
        fovRadians = Math.PI * (fov / 2) / 180,
        heightWidthRatio = HEIGHT / WIDTH,
        halfWidth = Math.tan(fovRadians),
        halfHeight = heightWidthRatio * halfWidth,
        cameraWidth = halfWidth * 2,
        cameraHeight = halfHeight * 2,
        pixelWidth = cameraWidth / (WIDTH - 1),
        pixelHeight = cameraHeight / (HEIGHT - 1);
    var cameraUnitVectors = [
        eyeUnitVect.getComponent(0),
        eyeUnitVect.getComponent(1),
        eyeUnitVect.getComponent(2),
        rightVect.getComponent(0),
        rightVect.getComponent(1),
        rightVect.getComponent(2),
        upVect.getComponent(0),
        upVect.getComponent(1),
        upVect.getComponent(2),
        cameraWidth,
        cameraHeight,
        pixelWidth,
        pixelHeight
    ];
    return cameraUnitVectors;
}

function getVectorLength(x, y, z) {
    return Math.sqrt(Math.pow(x, 2) + Math.pow(y, 2) + Math.pow(z, 2));
}

function dotProduct(ux, uy, uz, vx, vy, vz) {
    return ux * vx + uy * vy + uz * vz;
}

function lightIsBlockedByObject(shadowRay_x, shadowRay_y, shadowRay_z, shadowRayLength,
                                intersection_x, intersection_y, intersection_z,
                                center_x, center_y, center_z, radius) {
    var distanceToBlockingObject = 0;
    // calculating intersection of the shadow ray from the first object that was hit
    // by primary ray to another object
    var b = 2 * (shadowRay_x * (intersection_x - center_x)
        + shadowRay_y * (intersection_y - center_y)
        + shadowRay_z * (intersection_z - center_z));
    var c = Math.pow(intersection_x - center_x, 2) + Math.pow(intersection_y - center_y, 2)
        + Math.pow(intersection_z - center_z, 2) - Math.pow(radius, 2);
    var discriminant = Math.pow(b, 2) - 4 * c;

    if (discriminant < 0) {
        return 0;

    // if there is an object that intersects the shadow ray,
    // make sure that it is indeed blocking the light, not intersecting it on
    // the other side of the light source or behind the surface

        // one intersection
    } else if (discriminant == 0) {
        distanceToBlockingObject = -1 * b / 2;

        // two intersections, but only calculate one intersections because
        // for an obstacle to block the light if there are two intersections
        // both points must be between the light and the surface, and sqrt is
        // expensive to do. Corner cases such as solids overlapping can be
        // ignored because the inner surface being overlapped will not be
        // traced by the initial ray.
    } else if (discriminant > 0) {
        distanceToBlockingObject = (Math.sqrt(discriminant) - b) / 2;
    }

    if (0 < distanceToBlockingObject && distanceToBlockingObject < shadowRayLength) {
        return 1;
    }
    return 0;
}