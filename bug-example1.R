polys = SpatialPolygonsDataFrame(
    SpatialPolygons(list(
        Polygons(list(
            Polygon(coords = rbind(c(0, 0), c(0, 2), c(2, 2), c(2, 0), c(0, 0)))
        ), ID = "1")),
    SpatialPolygons(list(
        Polygons(list(
            Polygon(coords = rbind(c(3, 0), c(3, 2), c(5, 2), c(5, 0), c(3, 0)))
        ), ID = "2"))
    )), data = data.frame(id = c(1,2))
