#set page(width: auto, height: auto)
#import "@preview/cetz:0.3.4"

// SETTINGS
#let scale_city = 100
#let rot_city = -14deg
///////////////////////

#let find_width(coords, angle: 0deg) = {
  // First, transform all the points by rotating them around the origin by the given angle
  let (c_ang, s_ang) = (calc.cos(angle), calc.sin(angle))
  let transformed = coords.map(c => {
    let x = c.at(0) * c_ang - c.at(1) * s_ang
    let y = c.at(0) * s_ang + c.at(1) * c_ang
    return (x, y)
  })
  let xs = transformed.map(c => c.at(0))
  let ys = transformed.map(c => c.at(1))
  (
    calc.max(..xs) - calc.min(..xs),
    calc.max(..ys) - calc.min(..ys),
  )
}

/// Find the center of coordinates by finding the center of their bounding box
#let crude_center(coords) = {
  let xs = coords.map(c => c.at(0))
  let ys = coords.map(c => c.at(1))
  (
    (calc.max(..xs) + calc.min(..xs)) / 2,
    (calc.max(..ys) + calc.min(..ys)) / 2,
  )
}

/// Use ray casting to determine if a point is inside a polygon
#let is_point_in_polygon(point, polygon) = {
  let (x, y) = point
  let n = polygon.len()
  let inside = false

  for (p1, p2) in polygon.windows(2) {
    let (x1, y1) = p1
    let (x2, y2) = p2

    if ((y1 > y) != (y2 > y)) and (x < (x2 - x1) * (y - y1) / (y2 - y1) + x1) {
      inside = not inside
    }
  }
  inside
}

#let distance_squared(p1, p2) = {
  let (x1, y1) = p1
  let (x2, y2) = p2
  (x2 - x1) * (x2 - x1) + (y2 - y1) * (y2 - y1)
}

/// Clamp a point to an arbitrarily-oriented convex quadrilateral
/// The points of the quadrilateral should be given in clockwise order
#let clamp_to_convex_quadrilateral(point, quad) = {
  // First, check if the point is inside the quadrilateral
  if is_point_in_polygon(point, quad) {
    return point
  }

  // If not, find the closest edge of the quadrilateral and project the point onto it
  let projections = quad
    .windows(2)
    .map(((p1, p2)) => {
      let (x1, y1) = p1
      let (x2, y2) = p2
      let (px, py) = point

      // Calculate the projection of the point onto the line segment
      let dx = x2 - x1
      let dy = y2 - y1
      let len_sq = dx * dx + dy * dy
      if len_sq == 0 { return p1 } // p1 and p2 are the same point

      let t = ((px - x1) * dx + (py - y1) * dy) / len_sq
      t = calc.clamp(t, 0, 1)

      // Calculate the projected point
      (
        x1 + t * dx,
        y1 + t * dy,
      )
    })
  let closest_point = projections.at(0)
  let curr_distance_squared = distance_squared(closest_point, point)

  for p in projections {
    if distance_squared(p, point) < curr_distance_squared {
      closest_point = p
      curr_distance_squared = distance_squared(p, point)
    }
  }

  closest_point
}

/// Create the coordinates of a rectangle with the given lower left and upper right corners, rotated by the given angle
#let rectangle_at_angle(lower_left, upper_right, angle: 0deg) = {
  // Calculate the center of the rectangle
  let (x1, y1) = lower_left
  let (x2, y2) = upper_right

  let (dx, dy) = (x2 - x1, y2 - y1)

  // Calculate the coordinates of the rectangle at the given angle
  let (c_ang, s_ang) = (calc.cos(angle), calc.sin(angle))
  let dot_p = c_ang * dx + s_ang * dy
  let (corner1_x, corner1_y) = (x1 + c_ang * dot_p, y1 + s_ang * dot_p)
  let (corner3_x, corner3_y) = (x2 - c_ang * dot_p, y2 - s_ang * dot_p)
  (
    lower_left,
    (corner1_x, corner1_y),
    upper_right,
    (corner3_x, corner3_y),
    lower_left,
  )
}
//#rectangle_at_angle((0, 0), (1, 1), angle: 1deg)

//#find_width(((0, 0), (1, 0), (1, 1), (0, 1)), angle: -1deg)

//#is_point_in_polygon((0.5, 0.5), ((0, 0), (1, 0), (1, 1), (0, 1), (0, 0)))

#let (t_x_min, t_y_min) = (-79.6, 43.54)
#let (t_x_max, t_y_max) = (-79.10, 43.9)


// Neighborhood data
#let neighborhoods = json("./toronto-level-10-simp.geojson").features
#let neighborhood_boundaries = neighborhoods.filter(n => (
  n.properties.at("type", default: none) == "boundary" and n.geometry.at("type", default: none) == "Polygon"
))
#let regions = (
  json("./toronto-level-8-simp.geojson")
    .features
    .filter(n => (
      n.properties.at("type", default: none) == "boundary" and n.geometry.at("type", default: none) == "Polygon"
    ))
)
#regions.map(n => n.properties.name)
// Label each neighborhood with which region its in

#let neighborhood_boundaries_labelled = neighborhood_boundaries.map(b => {
  let region = "Downtown Toronto" // Default region
  for r in regions {
    if is_point_in_polygon(crude_center(b.geometry.coordinates.at(0)), r.geometry.coordinates.at(0)) {
      region = r.properties.name
      break
    }
  }
  b.properties.insert("region", region)
  b
})


#let color_map = (
  "Downtown Toronto": color.teal.lighten(40%),
  "Scarborough": color.eastern.rotate(-20deg).lighten(55%),
  "Etobicoke": color.yellow.lighten(60%),
  "East York": color.purple.rotate(-20deg).lighten(70%), //color.yellow.rotate(-30deg).lighten(60%),
  "York": color.purple.rotate(-20deg).lighten(70%),
  "North York": color.purple.rotate(-20deg).lighten(70%), //color.green.rotate(-50deg).lighten(50%),
)

// Load data for the lakes/rivers
#let lakes = json("./toronto-water-simp.geojson").features
#let lake_ontario = lakes.filter(l => l.properties.at("name", default: none) == "Lake Ontario").at(0)
#let lake_ontario_coords = {
  let skewed_bb = rectangle_at_angle(
    (t_x_min + 0.01, t_y_min),
    (t_x_max - 0.02, t_y_max),
    angle: -rot_city,
  )

  let lake_simp = lake_ontario
    .geometry
    .coordinates
    .filter(c => {
      // Nothing too small
      if c.len() < 5 { return false }
      // Nothing outside the Toronto bounding box
      if c.all(p => (
        (p.at(0) < t_x_min or p.at(0) > t_x_max) or (p.at(1) < t_y_min or p.at(1) > t_y_max)
      )) { return false }
      true
    })
    .map(c => {
      // Clamp the coordinates to the Toronto bounding box
      // c.map(p => (
      //   calc.clamp(p.at(0), t_x_min, t_x_max),
      //   calc.clamp(p.at(1), t_y_min, t_y_max),
      // ))
      c.map(p => {
        // Clamp the coordinates to the skewed bounding box
        clamp_to_convex_quadrilateral(p, skewed_bb)
      })
    })
    .map(c => {
      // Delete coordinates that are coplanar with their previous and successor points

      c
        .enumerate()
        .filter(((i, p)) => {
          if i == 0 or i == c.len() - 1 { return true } // Always keep the first and last point
          let prev = c.at(i - 1)
          let next = c.at(i + 1)
          // Check if the point is coplanar with its neighbors
          let (x1, y1) = prev
          let (x2, y2) = p
          let (x3, y3) = next
          // If the point is collinear with its neighbors, we can skip it
          let area = (x2 - x1) * (y3 - y1) - (y2 - y1) * (x3 - x1)
          // Use a small threshold to avoid floating point errors
          calc.abs(area) > 1e-15
        })
        .map(((i, p)) => (p))
    }) //.join()

  // The lake is the outline with the biggest coordinate count. Other things are islands, etc. We only want the lake.
  let m = calc.max(..lake_simp.map(c => c.len()))

  lake_simp.filter(c => c.len() == m)
} // Filter out any empty coordinates

#lake_ontario_coords

#cetz.canvas({
  import cetz.draw: *

  rotate(z: rot_city)
  scale(scale_city)

  // Draw the neighborhoods
  for (i, bound) in neighborhood_boundaries_labelled.enumerate() {
    let coords = bound.geometry.coordinates
    let neighborhood_name = bound.properties.at("name", default: "unknown")
    let curr_color = color_map.at(bound.properties.at("region"), default: color_map.at("Downtown Toronto"))
    for c in coords {
      let approx_center = crude_center(c)
      let rel_y = (approx_center.at(1) - 43.627) * 300
      let id = "neighborhood-" + str(i)
      line(
        ..c,
        name: id,
        fill: curr_color.rotate(rel_y * 2deg).darken(rel_y * .1%),
        stroke: white,
      )
      // Find the rough bounding box for the region
      let bb = find_width(c, angle: rot_city).map(v => v * scale_city * 1cm)
      let k = cetz.coordinate.resolve(bb)
      content(
        id,
        box(
          width: bb.at(0) / 2,
          height: bb.at(1),
          //fill: color.red.transparentize(50%),
          align(
            horizon + center,
            text(size: .5em, fill: white.darken(70%))[#neighborhood_name],
          ),
        ),
      )
    }
  }

  let region_text(it) = text(
    size: 1.5em,
    //stroke: white,
    fill: white.darken(0%),
    font: "AvantGarde",
    weight: 600,
    it,
  )

  // Label the regions
  for (i, region) in regions.enumerate() {
    let coords = region.geometry.coordinates.at(0)
    let id = "region-" + str(i)
    line(
      ..coords,
      name: id,
      fill: none,
      stroke: none,
    )
    // Find the rough bounding box for the region
    content(
      id,
      region_text[#region.properties.name],
    )
  }
  // Toronto is not included in the region list, so we add it manually
  content(
    (
      -79.3941415,
      43.6787203,
    ),
    region_text[Toronto],
    position: (0, 0),
    align: center,
  )

  // Draw Lake Ontario
  for coords in lake_ontario_coords {
    line(
      ..coords,
      fill: color.blue.lighten(80%), //color.blue.lighten(20%).transparentize(50%),
      stroke: (paint: white, dash: (2pt, 1pt)),
      //fill-rule: "even-odd",
    )
  }


  // Sample bounding box
  //line((t_x_min, t_y_min), (t_x_max, t_y_min), (t_x_max, t_y_max), (t_x_min, t_y_max), close: true, stroke: color.red)
  line(..rectangle_at_angle((t_x_min, t_y_min), (t_x_max, t_y_max), angle: -rot_city), close: true, stroke: color.red)

  //
  //   let nh = neighborhoods.at(0)
  //   for c in nh.geometry.coordinates {
  // line(..c)
  //   }
  //   let nh = neighborhoods.at(2)
  //   for c in nh.geometry.coordinates {
  // line(..c)
  //   }
})

//#{
//  let nh = neighborhoods.at(0)
//  for c in nh.geometry.coordinates {
//    [#c]
//  }
//}
//
//
//hello world

