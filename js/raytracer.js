// Kernel for rendering output, each thread colors one pixel on the image
function doit(mode, canvas_width, canvas_height) {
    var opt = {
        dimensions: [canvas_width, canvas_height],
        debug: false,
        graphical: true,
        safeTextureReadHack: false,
        constants: { OBJCOUNT: objects[0], SPHERE: ObjTyp.SPHERE },
        mode: mode
    };
    var kernalCreatorExpression = gpu.createKernel(function(Camera, Lights, Objects,
                                                            info, arg) {
        // Ray tracing

        // Ray of pixel(x,y) = directional vector + right vector * x pixel + up vector * y pixel
        // the factor is subtracted by half of camera width so rays are centered at eye vector

        var row = arg[1];
        var col = arg[2];
        var canvas_width = arg[5] / arg[4];
        var canvas_height = arg[6] / arg[3];

        // scaling camera's right unit vector with pixel number + position offset where
        //
        // position offset x == canvas width * col index of this canvas
        // position offset y == canvas height * row index of this canvas
        //
        var pixelToDraw_x = this.thread.x + canvas_width * col;
        var pixelToDraw_y = this.thread.y + canvas_height * row;

        // (thread.x + canvas width * column number) * pixel width - half of camera width
        var right_x = info[3] * (pixelToDraw_x * info[11] - info[9] * 0.5),
            right_y = info[4] * (pixelToDraw_x * info[11] - info[9] * 0.5),
            right_z = info[5] * (pixelToDraw_x * info[11] - info[9] * 0.5);

        // same goes for camera's up unit vector scaling with
        // (thread.y + canvas height * row number) * pixel height - half of camera height
        var up_x = info[6] * (pixelToDraw_y * info[12] - info[10] * 0.5),
            up_y = info[7] * (pixelToDraw_y * info[12] - info[10] * 0.5),
            up_z = info[8] * (pixelToDraw_y * info[12] - info[10] * 0.5);
        // summing (eye vector, right vector, up vector)
        var sum_x = info[0] + right_x + up_x,
            sum_y = info[1] + right_y + up_y,
            sum_z = info[2] + right_z + up_z;

        // Normalizing the ray vector
        var length = getVectorLength(sum_x, sum_y, sum_z);
        var ray_x = sum_x / length,
            ray_y = sum_y / length,
            ray_z = sum_z / length;

        // Sphere intersection calculation

        // This is dirty coding but cannot use Number.MAX_VALUE or Infinity
        // to denote a large number inside the kernel...
        var previousDistance = 10000000;
        // indicating the closest object it intersected, -1 if no intersection
        var intersectedObject = -1;
        for (var i = 0; i < this.constants.OBJCOUNT; i++) {
            var center_x = Objects[i * 13 +  10],
                center_y = Objects[i * 13 +  11],
                center_z = Objects[i * 13 +  12],
                radius = Objects[i * 13 +  13],
                origin_x = Camera[0],
                origin_y = Camera[1],
                origin_z = Camera[2],
                newDistance = 0;

            // solving for derived quadratic equation from parametric equation
            // gives the distance from the origin to intersection point if there is one
            // a, b, c are the parts of quadratic equation
            // a is 1 because ray vector is normalized
            var b = 2 * (ray_x * (origin_x - center_x) + ray_y * (origin_y - center_y)
                + ray_z * (origin_z - center_z));
            var c = Math.pow(origin_x - center_x, 2) + Math.pow(origin_y - center_y, 2)
                + Math.pow(origin_z - center_z, 2) - Math.pow(radius, 2);
            var discriminant = Math.pow(b, 2) - 4 * c;

            // no intersection found for this object
            if (discriminant < 0) {
                // do nothing
            } else {
                // one intersection
                if (discriminant == 0) {
                    newDistance = -1 * b / 2; // one intersection

                    // two intersections, in which case the closer one to the origin is picked
                } else {
                    var positive = (Math.sqrt(discriminant) - b) / 2;
                    var negative = -1 * (Math.sqrt(discriminant) + b) / 2;
                    if (Math.abs(positive) < Math.abs(negative)) {
                        newDistance = positive;
                    } else {
                        newDistance = negative;
                    }
                }
                // if first intersecting object found or
                // if new intersection point is closer to the camera, update the distance
                if (intersectedObject == -1 || Math.abs(newDistance) < Math.abs(previousDistance)) {
                    intersectedObject = i;
                    previousDistance = newDistance;
                }
            }
        }
        // if it did not intersect any objects color it white (background) and return
        if (intersectedObject == -1) {
            this.color(1,1,1);
            return 0;
        }

        // position of intersection, the surface where this pixel will represent
        var intersection_x = Camera[0] + ray_x * previousDistance,
            intersection_y = Camera[1] + ray_y * previousDistance,
            intersection_z = Camera[2] + ray_z * previousDistance;

        // normal unit vector on the surface at the intersection
        var normal_x = (intersection_x - Objects[intersectedObject * 13 + 10]) / Objects[intersectedObject * 13 + 13];
        var normal_y = (intersection_y - Objects[intersectedObject * 13 + 11]) / Objects[intersectedObject * 13 + 13];
        var normal_z = (intersection_z - Objects[intersectedObject * 13 + 12]) / Objects[intersectedObject * 13 + 13];

        var objectColor_r = Objects[intersectedObject * 13 + 3];
        var objectColor_g = Objects[intersectedObject * 13 + 4];
        var objectColor_b = Objects[intersectedObject * 13 + 5];
        var specular = Objects[intersectedObject * 13 + 6];
        var lambert = Objects[intersectedObject * 13 + 7];
        var ambience = Objects[intersectedObject * 13 + 8];
        var opacity = Objects[intersectedObject * 13 + 9];
        var lambertAmount = 0;
        var shadowCount = 0;

        // Lambertian shading

        for (i = 0; i < 2; i++) {
            // if shadowFlag == 1 the surface is under the shadow
            var shadowFlag = 0;
            var light_x = Lights[i * 6 + 1],
                light_y = Lights[i * 6 + 2],
                light_z = Lights[i * 6 + 3];

            var shadowRay_x = light_x - intersection_x,
                shadowRay_y = light_y - intersection_y,
                shadowRay_z = light_z - intersection_z;
            var shadowRayLength = Math.sqrt(Math.pow(shadowRay_x, 2)
                + Math.pow(shadowRay_y, 2) + Math.pow(shadowRay_z, 2));
            shadowRay_x = shadowRay_x / shadowRayLength;
            shadowRay_y = shadowRay_y / shadowRayLength;
            shadowRay_z = shadowRay_z / shadowRayLength;

            // calculating if there is any object between the intersection point and the light source
            for (var j = 0; j < this.constants.OBJCOUNT; j++) {
                if (j != intersectedObject) {
                    var center_x = Objects[j * 13 + 10];
                    var center_y = Objects[j * 13 +  11];
                    var center_z = Objects[j * 13 +  12];
                    var radius = Objects[j * 13 +  13];
                    if (lightIsBlockedByObject(shadowRay_x, shadowRay_y, shadowRay_z, shadowRayLength,
                            intersection_x, intersection_y, intersection_z,
                            center_x, center_y, center_z, radius) == 1) {
                        shadowFlag = 1;
                    }
                }
            }

            // calculate lambertian reflectance if the surface has no shadow cast on it
            if (shadowFlag == 0) {
                // dot product of normal vector and shadow ray to find cos(angle) between them
                // contribution = [-1, 1]
                var contribution = dotProduct(normal_x, normal_y, normal_z, shadowRay_x, shadowRay_y, shadowRay_z);
                if (contribution < 0.1) {
                    contribution = 0.1;
                }
                // final lambert value is sum of all contribution from all light sources
                lambertAmount += contribution;
                if (lambertAmount > 1) {
                    lambertAmount = 1;
                }

                // if shadowFlag is set, count how many shadows it is under
            } else {
                shadowCount += 1;
            }
        }

        // Specular reflection

        var thisObject = intersectedObject;
        // calculate new reflected vector
        var temp = 2 * dotProduct(normal_x, normal_y, normal_z, ray_x, ray_y, ray_z);
        ray_x = ray_x - temp * normal_x;
        ray_y = ray_y - temp * normal_y;
        ray_z = ray_z - temp * normal_z;
        length = getVectorLength(ray_x, ray_y, ray_z);
        ray_x = ray_x / length;
        ray_y = ray_y / length;
        ray_z = ray_z / length;
        previousDistance = 1000000;
        var first = 1;
        // ray trace with the new reflected vector
        for (var i = 0; i < this.constants.OBJCOUNT; i++) {
            if (i != intersectedObject) {
                var center_x = Objects[i * 13 +  10],
                    center_y = Objects[i * 13 +  11],
                    center_z = Objects[i * 13 +  12],
                    radius = Objects[i * 13 +  13],
                    newDistance = 0;
                var b = 2 * (ray_x * (intersection_x - center_x)
                    + ray_y * (intersection_y - center_y)
                    + ray_z * (intersection_z - center_z));
                var c = Math.pow(intersection_x - center_x, 2) + Math.pow(intersection_y - center_y, 2)
                    + Math.pow(intersection_z - center_z, 2) - Math.pow(radius, 2);
                var discriminant = Math.pow(b, 2) - 4 * c;
                // no intersection found for this object
                if (discriminant < 0) {
                    // do nothing, 'continue' is not allowed inside the kernel
                } else {
                    // one intersection
                    if (discriminant == 0) {
                        newDistance = -1 * b / 2; // one intersection

                        // two intersections, in which case the closer one to the origin is picked
                    } else {
                        var positive = (Math.sqrt(discriminant) - b) / 2;
                        var negative = -1 * (Math.sqrt(discriminant) + b) / 2;
                        if (Math.abs(positive) < Math.abs(negative)) {
                            newDistance = positive;
                        } else {
                            newDistance = negative;
                        }
                    }
                    // if first intersecting object found or
                    // if new intersection point is closer to the camera, update the distance
                    if (first == 1) {
                        if (0 < newDistance && newDistance < previousDistance) {
                            intersectedObject = i;
                            previousDistance = newDistance;
                            first = 0;
                        }
                    }
                }
            }
        }
        var reflectedColor_r = 0,
            reflectedColor_g = 0,
            reflectedColor_b = 0;
        // if it intersected something and it did not intersect itself
        if (intersectedObject != -1 && intersectedObject != thisObject) {
            reflectedColor_r = Objects[intersectedObject * 13 + 3];
            reflectedColor_g = Objects[intersectedObject * 13 + 4];
            reflectedColor_b = Objects[intersectedObject * 13 + 5];
        }


        // Assign color to the pixel

        // Ambience + lambert + specular - shadowCount * 0.1
        this.color(objectColor_r * ambience + lambert * lambertAmount + reflectedColor_r * specular - shadowCount * 0.1,
            objectColor_g * ambience + lambert * lambertAmount + reflectedColor_g * specular - shadowCount * 0.1,
            objectColor_b * ambience + lambert * lambertAmount + reflectedColor_b * specular - shadowCount * 0.1);

    }, opt);
    return kernalCreatorExpression;
}
