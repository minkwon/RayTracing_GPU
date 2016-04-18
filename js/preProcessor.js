// Kernel for checking whether each canvas contains an object
function createKernelForPreProcessing(PP_ROWS, PP_COLUMNS) {
    var opt = {
        dimensions: [PP_ROWS, PP_COLUMNS],
        debug: false,
        graphical: false,
        safeTextureReadHack: false,
        constants: { OBJCOUNT: objects[0], SPHERE: ObjTyp.SPHERE },
        mode: 'gpu'
    };
    var kernelExpression = gpu.createKernel(function (Objects, info, Camera, unitWidth) {

        // scaling camera's right unit vector with pixel number * width of unit width
        //
        // position offset x == unit width * col index
        // position offset y == unit width * row index
        //
        // as unit width == unit height
        //
        var pixelToDraw_x = this.thread.x * unitWidth;
        var pixelToDraw_y = this.thread.y * unitWidth;

        // Camera's right vector is scaled with:
        //
        // thread.x * unit pixel width - half of camera width
        var right_x = info[3] * (pixelToDraw_x * info[11] - info[9] * 0.5),
            right_y = info[4] * (pixelToDraw_x * info[11] - info[9] * 0.5),
            right_z = info[5] * (pixelToDraw_x * info[11] - info[9] * 0.5);

        // same goes for camera's up unit vector scaling with:
        //
        // thread.y * unit pixel width - half of camera height
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

        // indicating the closest object it intersected, -1 if no intersection
        for (var i = 0; i < this.constants.OBJCOUNT; i++) {
            var center_x = Objects[i * 13 + 10],
                center_y = Objects[i * 13 + 11],
                center_z = Objects[i * 13 + 12],
                radius = Objects[i * 13 + 13],
                origin_x = Camera[0],
                origin_y = Camera[1],
                origin_z = Camera[2];

            // solving for derived quadratic equation from parametric equation
            // gives the distance from the origin to intersection point if there is one
            // a, b, c are the parts of quadratic equation
            // a is 1 because ray vector is normalized
            var b = 2 * (ray_x * (origin_x - center_x) + ray_y * (origin_y - center_y)
                + ray_z * (origin_z - center_z));
            var c = Math.pow(origin_x - center_x, 2) + Math.pow(origin_y - center_y, 2)
                + Math.pow(origin_z - center_z, 2) - Math.pow(radius, 2);
            var discriminant = Math.pow(b, 2) - 4 * c;

            // if any intersection found for this object
            if (discriminant >= 0) {
                return 1;
            }
        }
        // if the ray did not intersect any objects
        return 0;
    }, opt);
    return kernelExpression;
}