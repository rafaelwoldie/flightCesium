const clamp = (n, min = -50, max = 50) => Math.max(min, Math.min(max, n));
let leftPressed = false, rightPressed = false;
let start = { x: 0, y: 0 };
let touchIds = { left: null, right: null };
let thumbState = { left: { x: 0, y: 0 }, right: { x: 0, y: 0 } };
let userLocation =  {latitude:  11.599434, longitude: 37.386922}

let viewer;
let droneEntity;
let loc = await location.get

let droneLat = Cesium.Math.toRadians(userLocation.latitude);
let droneLon = Cesium.Math.toRadians(userLocation.longitude);
let droneAlt = 1;
let droneHeading = Math.PI ; // Facing north

const velocityScale = 2e-8;  // Degrees per frame
const altitudeScale = 0.25;      // Meters per input unit
const rotationScale = 4e-4;    // Radians per input unit

const $leftThumb = $(".leftThumbRest");
const $rightThumb = $(".rightThumbRest");
if (navigator.geolocation) {
  navigator.geolocation.getCurrentPosition(
    (position) => {

      userLocation = {latitude:  position.coords.latitude, longitude: position.coords.longitude}
      droneLat = Cesium.Math.toRadians(userLocation.latitude);
      droneLon = Cesium.Math.toRadians(userLocation.longitude); initializeCesium();
      setInterval(updateDroneEntity, 50);
    },
    (error) => {
      alert("Access denied")   }
  );
} else {
  alert('there is no geolocation api')

}
function updateThumb(dx, dy, $thumb, side) {
  const deltaX = clamp(dx - start.x);
  const deltaY = clamp(dy - start.y);
  $thumb.css("transform", `translate(${deltaX}px, ${deltaY}px)`);
  thumbState[side] = { x: deltaX, y: deltaY };
}

function resetThumb($thumb, side) {
  $thumb.css("transform", "translate(0%, 0%)");
  thumbState[side] = { x: 0, y: 0 };
}

$(document).on("mousedown", ".thumbRest", function (e) {
  start = { x: e.pageX, y: e.pageY };
  if ($(this).hasClass("leftThumbRest")) leftPressed = true;
  else if ($(this).hasClass("rightThumbRest")) rightPressed = true;
});

$(document).on("mousemove", function (e) {
  if (leftPressed) updateThumb(e.pageX, e.pageY, $leftThumb, "left");
  if (rightPressed) updateThumb(e.pageX, e.pageY, $rightThumb, "right");
});

$(document).on("mouseup", function () {
  if (leftPressed) resetThumb($leftThumb, "left");
  if (rightPressed) resetThumb($rightThumb, "right");
  leftPressed = rightPressed = false;
});

$(document).on("touchstart", function (e) {
  $(e.changedTouches).each(function () {
    const target = document.elementFromPoint(this.pageX, this.pageY);
    if ($(target).hasClass("leftThumbRest")) {
      start = { x: this.pageX, y: this.pageY };
      leftPressed = true;
      touchIds.left = this.identifier;
    } else if ($(target).hasClass("rightThumbRest")) {
      start = { x: this.pageX, y: this.pageY };
      rightPressed = true;
      touchIds.right = this.identifier;
    }
  });
});

$(document).on("touchmove", function (e) {
  $(e.changedTouches).each(function () {
    if (this.identifier === touchIds.left && leftPressed) {
      updateThumb(this.pageX, this.pageY, $leftThumb, "left");
    } else if (this.identifier === touchIds.right && rightPressed) {
      updateThumb(this.pageX, this.pageY, $rightThumb, "right");
    }
  });
});

$(document).on("touchend", function (e) {
  $(e.changedTouches).each(function () {
    if (this.identifier === touchIds.left) {
      leftPressed = false;
      resetThumb($leftThumb, "left");
    } else if (this.identifier === touchIds.right) {
      rightPressed = false;
      resetThumb($rightThumb, "right");
    }
  });
});

async function initializeCesium() {
  Cesium.Ion.defaultAccessToken = accessToken;

  viewer = new Cesium.Viewer("cesiumContainer", {
    terrainProvider: await Cesium.CesiumTerrainProvider.fromIonAssetId(1),
  });
  viewer.scene.globe.depthTestAgainstTerrain = true;

  droneEntity = viewer.entities.add({
    position: Cesium.Cartesian3.fromRadians(droneLon, droneLat, droneAlt),
    orientation: Cesium.Transforms.headingPitchRollQuaternion(
      Cesium.Cartesian3.fromRadians(droneLon, droneLat, droneAlt),
      new Cesium.HeadingPitchRoll(droneHeading, Cesium.Math.toRadians(90), 0)
    ),
    model: {
      uri: "/Drone_in_Focus_0724075519_texture.glb",
      scale: 1.0
    }
  });

  viewer.trackedEntity = droneEntity;
}

function updateDroneEntity() {
  if (!droneEntity) return;

  const left = thumbState.left;
  const right = thumbState.right;

  droneAlt += -right.y * altitudeScale;
    if(droneAlt < 1){
      droneAlt = 1
  }
  droneAlt = Math.max(droneAlt, 1);

  droneHeading += right.x * rotationScale;

  const angle = Math.atan2(-left.y, -left.x);
  const direction = droneHeading + angle;
  const distance = velocityScale * Math.sqrt(left.x ** 2 + left.y ** 2);

  droneLat += distance * Math.cos(direction);
  droneLon += distance * Math.sin(direction);

  droneLat = Cesium.Math.clamp(
    droneLat,
    -Cesium.Math.PI_OVER_TWO + 0.01,
    Cesium.Math.PI_OVER_TWO - 0.01
  );
  droneLon = Cesium.Math.negativePiToPi(droneLon);

const carto = new Cesium.Cartographic(droneLon, droneLat);
Cesium.sampleTerrainMostDetailed(viewer.terrainProvider, [carto])
  .then((updated) => {
    const terrainHeight = updated[0].height;
    const adjustedAlt = terrainHeight + droneAlt;

    const position = Cesium.Cartesian3.fromRadians(droneLon, droneLat, adjustedAlt);
    const orientation = Cesium.Transforms.headingPitchRollQuaternion(
      position,
      new Cesium.HeadingPitchRoll(droneHeading, 0, 0)
    );

    droneEntity.position = position;
    droneEntity.orientation = orientation;


    const latDeg = Cesium.Math.toDegrees(droneLat).toFixed(6);
  const lonDeg = Cesium.Math.toDegrees(droneLon).toFixed(6);
  const alt = droneAlt.toFixed(2);
  const headingDeg = Cesium.Math.toDegrees(droneHeading).toFixed(2);

  const info = `Alt: ${alt} m, Heading: ${headingDeg}°`;
  $('.info').text(info)
  });

}


function updateCamera(e) {
  let angle = 60-e.target.value * 120/100
  const camera = viewer.camera;
  const targetPosition = Cesium.Cartesian3.fromRadians(droneLon, droneLat, droneAlt);
  
  // Pitch upward (negative radians = look down, positive = up)
  const heading = droneHeading;
  const pitch = Cesium.Math.toRadians(-angle); // adjust closer to 0 for more horizon
  const range = 300; // distance from the drone
  
  camera.lookAt(targetPosition, new Cesium.HeadingPitchRange(heading, pitch, range));

}

let $pitch = $('[type="range"]').on('input', updateCamera)